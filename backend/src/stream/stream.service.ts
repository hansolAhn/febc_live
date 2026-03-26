import { createHash, createHmac, timingSafeEqual } from "crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SessionsService } from "../sessions/sessions.service";

type PlaybackTokenPayload = {
  stream: string;
  sessionKey: string;
  branchId: string;
  exp: number;
};

type StreamRuntimeState = {
  stream: string;
  isPublishing: boolean;
  lastPublishedAt: string | null;
  lastStoppedAt: string | null;
  lastSegmentSeenAt: string | null;
  lastPlaylistSignature: string | null;
  lastPlaylistUpdatedAt: string | null;
  lifecyclePhase: "idle" | "publishing" | "playback-ready" | "stopped";
  viewerHeartbeats: Map<string, string>;
};

type PlaylistProbeResult = {
  hasManifest: boolean;
  hasPlayableMedia: boolean;
  playlistSignature: string | null;
};

@Injectable()
export class StreamService {
  private readonly tokenTtlSeconds: number;
  private readonly signingSecret: string;
  private readonly internalHlsBaseUrl: string;
  private readonly viewerHeartbeatWindowMs = 20_000;
  private readonly playbackReadyWindowMs = 6_000;
  private readonly publishWarmupWindowMs = 6_000;
  private readonly runtimeStates = new Map<string, StreamRuntimeState>();

  constructor(
    private readonly configService: ConfigService,
    private readonly sessionsService: SessionsService
  ) {
    this.tokenTtlSeconds = Number(this.configService.get<string>("STREAM_TOKEN_TTL_SECONDS") ?? "300");
    this.signingSecret = this.configService.get<string>("FORENSIC_WATERMARK_SECRET") ?? "replace-with-watermark-secret";
    this.internalHlsBaseUrl = this.configService.get<string>("STREAM_INTERNAL_HLS_BASE_URL") ?? "http://srs:8080/live";
  }

  validateHook(event: "publish" | "play" | "stop", stream: string) {
    const state = this.getOrCreateState(stream);
    const now = new Date().toISOString();

    if (event === "publish") {
      state.isPublishing = true;
      state.lastPublishedAt = now;
      state.lastStoppedAt = null;
      state.lastSegmentSeenAt = now;
      this.setLifecyclePhase(state, "publishing", `방송 시작 감지됨: ${stream}`);
    }

    if (event === "stop") {
      state.isPublishing = false;
      state.lastStoppedAt = now;
      state.lastSegmentSeenAt = null;
      state.lastPlaylistSignature = null;
      state.lastPlaylistUpdatedAt = null;
      state.viewerHeartbeats.clear();
      this.setLifecyclePhase(state, "stopped", `방송 종료 감지됨: ${stream}`);
    }

    return { allowed: true, event, stream, watermarkToken: "mvp-watermark-token" };
  }

  async issuePlaybackAccess(accessToken: string, stream: string) {
    const session = await this.sessionsService.findByAccessToken(accessToken);
    if (!session) {
      throw new UnauthorizedException("Session not found");
    }

    const exp = Math.floor(Date.now() / 1000) + this.tokenTtlSeconds;
    const payload: PlaybackTokenPayload = {
      stream,
      sessionKey: session.sessionKey,
      branchId: session.branchId,
      exp
    };
    const token = this.signPayload(payload);
    const hlsBaseUrl = this.configService.get<string>("STREAM_HLS_BASE_URL") ?? "/hls/live";

    return {
      stream,
      expiresAt: new Date(exp * 1000).toISOString(),
      token,
      hlsUrl: `${hlsBaseUrl}/${stream}.m3u8?playbackToken=${encodeURIComponent(token)}`
    };
  }

  async authorizePlayback(originalUri: string, playbackToken?: string) {
    if (!playbackToken) {
      throw new UnauthorizedException("Playback token required");
    }

    const payload = this.verifyToken(playbackToken);
    const requestedStream = this.extractStreamFromUri(originalUri);

    if (requestedStream && requestedStream !== payload.stream) {
      throw new UnauthorizedException("Invalid stream access");
    }

    const session = await this.sessionsService.findActiveSessionBySessionKey(payload.sessionKey);
    if (!session) {
      throw new UnauthorizedException("Session expired");
    }

    if (session.branchId !== payload.branchId) {
      throw new UnauthorizedException("Session branch mismatch");
    }

    this.markViewerHeartbeat(payload.stream, payload.sessionKey);
    this.markSegmentSeen(payload.stream);

    return { allowed: true };
  }

  async getStreamStatus(stream: string) {
    const state = this.getOrCreateState(stream);
    this.pruneViewerHeartbeats(state);

    const probeResult = await this.probePlaylist(stream);
    const now = Date.now();
    const stoppedAfterLastPublish = Boolean(
      state.lastStoppedAt &&
        (!state.lastPublishedAt ||
          new Date(state.lastStoppedAt).getTime() >= new Date(state.lastPublishedAt).getTime())
    );

    if (!stoppedAfterLastPublish && probeResult.hasManifest && probeResult.playlistSignature) {
      if (probeResult.playlistSignature !== state.lastPlaylistSignature) {
        const updatedAt = new Date().toISOString();
        state.lastPlaylistSignature = probeResult.playlistSignature;
        state.lastPlaylistUpdatedAt = updatedAt;
        if (probeResult.hasPlayableMedia) {
          state.lastSegmentSeenAt = updatedAt;
        }
      }
    }

    if (stoppedAfterLastPublish) {
      state.isPublishing = false;
      state.lastPlaylistSignature = null;
      state.lastPlaylistUpdatedAt = null;
      state.lastSegmentSeenAt = null;
      this.setLifecyclePhase(state, "stopped", `방송 종료 상태 반영됨: ${stream}`);
    }

    const effectiveLastPlaylistSeenAt = stoppedAfterLastPublish ? null : state.lastPlaylistUpdatedAt;
    const effectiveLastSegmentSeenAt = stoppedAfterLastPublish ? null : state.lastSegmentSeenAt;
    const playbackAvailable = Boolean(
      effectiveLastSegmentSeenAt &&
        now - new Date(effectiveLastSegmentSeenAt).getTime() <= this.playbackReadyWindowMs
    );

    const hasRecentPublish =
      Boolean(state.lastPublishedAt) &&
      now - new Date(state.lastPublishedAt as string).getTime() <= this.publishWarmupWindowMs;

    const hasRecentManifest =
      Boolean(effectiveLastPlaylistSeenAt) &&
      now - new Date(effectiveLastPlaylistSeenAt as string).getTime() <= this.publishWarmupWindowMs;

    const effectivePublishing =
      !stoppedAfterLastPublish && (playbackAvailable || hasRecentManifest || (state.isPublishing && hasRecentPublish));

    state.isPublishing = effectivePublishing;

    if (playbackAvailable) {
      this.setLifecyclePhase(state, "playback-ready", `방송 재생 가능 상태 감지됨: ${stream}`);
    } else if (effectivePublishing) {
      this.setLifecyclePhase(state, "publishing", `방송 송출 중 상태 감지됨: ${stream}`);
    } else if (!stoppedAfterLastPublish) {
      this.setLifecyclePhase(state, "idle", `방송 대기 상태 감지됨: ${stream}`);
    }

    const activeViewerCount = effectivePublishing ? state.viewerHeartbeats.size : 0;

    return {
      stream,
      isPublishing: effectivePublishing,
      playbackAvailable,
      lastPublishedAt: state.lastPublishedAt,
      lastStoppedAt: state.lastStoppedAt,
      lastSegmentSeenAt: effectiveLastSegmentSeenAt,
      activeViewerCount
    };
  }

  private getOrCreateState(stream: string) {
    const existing = this.runtimeStates.get(stream);
    if (existing) {
      return existing;
    }

    const created: StreamRuntimeState = {
      stream,
      isPublishing: false,
      lastPublishedAt: null,
      lastStoppedAt: null,
      lastSegmentSeenAt: null,
      lastPlaylistSignature: null,
      lastPlaylistUpdatedAt: null,
      lifecyclePhase: "idle",
      viewerHeartbeats: new Map<string, string>()
    };
    this.runtimeStates.set(stream, created);
    return created;
  }

  private setLifecyclePhase(
    state: StreamRuntimeState,
    nextPhase: StreamRuntimeState["lifecyclePhase"],
    message: string
  ) {
    if (state.lifecyclePhase === nextPhase) {
      return;
    }

    state.lifecyclePhase = nextPhase;
    console.log(`[StreamService] ${message}`);
  }

  private markViewerHeartbeat(stream: string, sessionKey: string) {
    const state = this.getOrCreateState(stream);
    state.viewerHeartbeats.set(sessionKey, new Date().toISOString());
    this.pruneViewerHeartbeats(state);
  }

  private markSegmentSeen(stream: string) {
    const state = this.getOrCreateState(stream);
    const now = new Date().toISOString();
    state.lastSegmentSeenAt = now;
    state.lastPlaylistUpdatedAt = now;
  }

  private pruneViewerHeartbeats(state: StreamRuntimeState) {
    const now = Date.now();
    for (const [sessionKey, timestamp] of state.viewerHeartbeats.entries()) {
      if (now - new Date(timestamp).getTime() > this.viewerHeartbeatWindowMs) {
        state.viewerHeartbeats.delete(sessionKey);
      }
    }
  }

  private async probePlaylist(stream: string): Promise<PlaylistProbeResult> {
    const playlistUrl = `${this.internalHlsBaseUrl}/${stream}.m3u8`;

    try {
      const response = await fetch(playlistUrl, {
        method: "GET",
        headers: { Accept: "application/vnd.apple.mpegurl,text/plain,*/*" },
        cache: "no-store"
      });

      if (!response.ok) {
        return { hasManifest: false, hasPlayableMedia: false, playlistSignature: null };
      }

      const body = await response.text();
      const hasPlayableMedia = body.includes(".ts") || body.includes("#EXTINF");
      const hasManifest = hasPlayableMedia || body.includes("#EXT-X-STREAM-INF") || body.includes(".m3u8");

      if (!hasManifest) {
        return { hasManifest: false, hasPlayableMedia: false, playlistSignature: null };
      }

      return {
        hasManifest: true,
        hasPlayableMedia,
        playlistSignature: createHash("sha1").update(body).digest("hex")
      };
    } catch {
      return { hasManifest: false, hasPlayableMedia: false, playlistSignature: null };
    }
  }

  private extractStreamFromUri(originalUri: string) {
    const playlistMatch = originalUri.match(/^\/(?:hls\/)?live\/([^/.]+)\.m3u8(?:\?|$)/);
    if (playlistMatch?.[1]) {
      return playlistMatch[1];
    }

    const segmentMatch = originalUri.match(/^\/(?:hls\/)?live\/(.+)-\d+\.ts(?:\?|$)/);
    return segmentMatch?.[1] ?? null;
  }

  private signPayload(payload: PlaybackTokenPayload) {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", this.signingSecret).update(encodedPayload).digest("base64url");
    return `${encodedPayload}.${signature}`;
  }

  private verifyToken(token: string) {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      throw new UnauthorizedException("Invalid playback token");
    }

    const expectedSignature = createHmac("sha256", this.signingSecret).update(encodedPayload).digest("base64url");
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
      throw new UnauthorizedException("Invalid playback token");
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as PlaybackTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("Playback token expired");
    }

    return payload;
  }
}
