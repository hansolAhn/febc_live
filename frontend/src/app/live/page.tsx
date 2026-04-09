"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LivePlayer, PlaybackState } from "@/components/LivePlayer";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/components/providers/AuthProvider";
import * as mockApi from "@/lib/mock-api";

type PlaybackAccess = Awaited<ReturnType<typeof mockApi.fetchPlaybackAccess>>;
type StreamStatus = Awaited<ReturnType<typeof mockApi.fetchStreamStatus>>;

type StatusMeta = {
  label: string;
  className: string;
  message: string;
};

function buildBranchStatusMeta(options: {
  playerState: PlaybackState;
  streamStatus: StreamStatus | null;
  playbackAccess: PlaybackAccess | null;
  error: string | null;
  showStoppedNotice: boolean;
}): StatusMeta {
  const { playerState, streamStatus, playbackAccess, error, showStoppedNotice } = options;
  const isPublishing = Boolean(streamStatus?.isPublishing);
  const playbackAvailable = Boolean(streamStatus?.playbackAvailable);

  if (error?.includes("Session") || error?.includes("session")) {
    return {
      label: "세션 종료",
      className: "risk-badge risk-high",
      message: "로그인 세션이 종료되었습니다. 다시 로그인해 주세요."
    };
  }

  if (error?.includes("expired") || error?.includes("Playback token")) {
    return {
      label: "권한 만료",
      className: "risk-badge risk-high",
      message: "재생 권한이 만료되었습니다. 다시 로그인해 주세요."
    };
  }

  if (showStoppedNotice && !isPublishing && !playbackAvailable) {
    return {
      label: "방송 종료",
      className: "risk-badge risk-medium",
      message: "방송이 종료되었습니다."
    };
  }

  if (!isPublishing && !playbackAvailable) {
    return {
      label: "방송 준비 중",
      className: "risk-badge risk-medium",
      message: "방송이 시작되면 자동으로 시청 준비 상태로 전환됩니다."
    };
  }

  if (playerState.status === "error") {
    return {
      label: "재생 오류",
      className: "risk-badge risk-high",
      message: "재생 중 오류가 발생했습니다. 새로고침 후 다시 이용해주세요."
    };
  }

  if (playerState.status === "playing") {
    return {
      label: "시청 중",
      className: "risk-badge risk-low",
      message: "방송을 정상적으로 시청하고 있습니다."
    };
  }

  if (playerState.status === "loading") {
    return {
      label: "재생 준비 중",
      className: "risk-badge risk-medium",
      message: "방송 재생을 준비하고 있습니다. 잠시만 기다려 주세요."
    };
  }

  if (playbackAccess || playbackAvailable || isPublishing) {
    return {
      label: "재생 대기",
      className: "risk-badge risk-medium",
      message: "방송 송출 중입니다. 가운데 재생 버튼을 눌러 주세요."
    };
  }

  return {
    label: "방송 준비 중",
    className: "risk-badge risk-medium",
    message: "방송이 시작되면 자동으로 시청 준비 상태로 전환됩니다."
  };
}

export default function LivePage() {
  const branchPlaybackWarmupSessionKey = "febc-live-branch-warmup-complete";
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const isSuperAdmin = user?.roleCode === "SUPER_ADMIN";

  const [playbackAccess, setPlaybackAccess] = useState<PlaybackAccess | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [playerState, setPlayerState] = useState<PlaybackState>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [showStoppedNotice, setShowStoppedNotice] = useState(false);
  const [playerRenderKey, setPlayerRenderKey] = useState(0);
  const [branchManualStartDelayMs, setBranchManualStartDelayMs] = useState(15000);

  const requestedForCurrentStreamRef = useRef(false);
  const previousLiveSignalRef = useRef(false);

  const isPublishing = Boolean(streamStatus?.isPublishing);
  const playbackAvailable = Boolean(streamStatus?.playbackAvailable);
  const hasLiveSignal = isPublishing || playbackAvailable;

  useEffect(() => {
    if (isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isSuperAdmin, router]);

  useEffect(() => {
    if (!userId || isSuperAdmin) return;

    let cancelled = false;

    const loadStreamStatus = async () => {
      try {
        const response = await mockApi.fetchStreamStatus("main");
        if (!cancelled) {
          setStreamStatus(response);
        }
      } catch {
        if (!cancelled) {
          setStreamStatus(null);
        }
      }
    };

    void loadStreamStatus();
    const timer = window.setInterval(() => {
      void loadStreamStatus();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isSuperAdmin, userId]);

  useEffect(() => {
    if (isSuperAdmin) {
      return;
    }

    requestedForCurrentStreamRef.current = false;
    setPlaybackAccess(null);
    setPlayerState({ status: "idle" });
    setError(null);
    setShowStoppedNotice(false);
    if (typeof window !== "undefined") {
      if (window.sessionStorage.getItem(branchPlaybackWarmupSessionKey) === "ready") {
        setBranchManualStartDelayMs(0);
      } else {
        setBranchManualStartDelayMs(15000);
      }
    }
    setPlayerRenderKey((current) => current + 1);
    previousLiveSignalRef.current = false;
  }, [branchPlaybackWarmupSessionKey, isSuperAdmin]);

  useEffect(() => {
    if (typeof window === "undefined" || isSuperAdmin || streamStatus === null) {
      return;
    }

    if (!hasLiveSignal) {
      window.sessionStorage.removeItem(branchPlaybackWarmupSessionKey);
      setBranchManualStartDelayMs(15000);
      return;
    }

    if (window.sessionStorage.getItem(branchPlaybackWarmupSessionKey) === "ready") {
      setBranchManualStartDelayMs(0);
      return;
    }

    setBranchManualStartDelayMs(15000);
  }, [branchPlaybackWarmupSessionKey, hasLiveSignal, isSuperAdmin, streamStatus]);

  useEffect(() => {
    if (isSuperAdmin) {
      return;
    }

    const hadLiveSignal = previousLiveSignalRef.current;
    previousLiveSignalRef.current = hasLiveSignal;

    if (!hasLiveSignal) {
      if (hadLiveSignal || playbackAccess || playerState.status === "playing" || playerState.status === "loading") {
        setShowStoppedNotice(true);
        requestedForCurrentStreamRef.current = false;
        setPlaybackAccess(null);
        setPlayerState({ status: "idle" });
        setPlayerRenderKey((current) => current + 1);
      }
      return;
    }

    setShowStoppedNotice(false);
  }, [hasLiveSignal, isSuperAdmin, playbackAccess, playerState.status]);

  useEffect(() => {
    if (!user || !userId || isSuperAdmin) return;
    if (!hasLiveSignal || playbackAccess) return;

    const accessToken = window.localStorage.getItem("febc_live_access_token");
    if (!accessToken) {
      setError("로그인 세션을 찾을 수 없습니다.");
      return;
    }

    let cancelled = false;

    const loadPlaybackAccess = async () => {
      if (requestedForCurrentStreamRef.current) {
        return;
      }

      setError(null);

      try {
        const response = await mockApi.fetchPlaybackAccess(accessToken, "main");
        if (!cancelled) {
          requestedForCurrentStreamRef.current = true;
          setPlaybackAccess(response);
          setPlayerState({ status: "ready" });
          setShowStoppedNotice(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          requestedForCurrentStreamRef.current = false;
          setPlaybackAccess(null);
          setPlayerState({ status: "error", message: "재생 권한을 불러오지 못했습니다." });
          setError(loadError instanceof Error ? loadError.message : "재생 권한을 불러오지 못했습니다.");
        }
      }
    };

    void loadPlaybackAccess();
    const retryTimer = window.setInterval(() => {
      void loadPlaybackAccess();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(retryTimer);
    };
  }, [hasLiveSignal, isSuperAdmin, playbackAccess, user, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || isSuperAdmin) {
      return;
    }

    if (!hasLiveSignal || !playbackAccess) {
      return;
    }

    if (branchManualStartDelayMs === 0) {
      window.sessionStorage.setItem(branchPlaybackWarmupSessionKey, "ready");
      return;
    }

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(branchPlaybackWarmupSessionKey, "ready");
    }, branchManualStartDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    branchManualStartDelayMs,
    branchPlaybackWarmupSessionKey,
    isSuperAdmin,
    hasLiveSignal,
    playbackAccess
  ]);

  useEffect(() => {
    if (playerState.status === "playing") {
      setShowStoppedNotice(false);
    }
  }, [playerState.status]);

  const statusMeta = useMemo(
    () =>
      buildBranchStatusMeta({
        playerState,
        streamStatus,
        playbackAccess,
        error,
        showStoppedNotice
      }),
    [error, playbackAccess, playerState, showStoppedNotice, streamStatus]
  );

  if (!user || isSuperAdmin) {
    return null;
  }

  const shouldRenderBranchPlayer = Boolean(hasLiveSignal && playbackAccess);
  const resolvedBranchPlaybackAccess = shouldRenderBranchPlayer ? playbackAccess : null;

  return (
    <div className="page-wrap">
      <PageHeader title="라이브 시청" subtitle="내부 방송을 시청합니다." />

      <div className="panel">
        <div className="panel-header-inline">
          <div className="panel-title">라이브 화면</div>
          <span className={statusMeta.className}>{statusMeta.label}</span>
        </div>
        <div className="stream-status-copy">{statusMeta.message}</div>
        {resolvedBranchPlaybackAccess ? (
          <LivePlayer
            key={`live-branch-${playerRenderKey}-${resolvedBranchPlaybackAccess.expiresAt}`}
            src={resolvedBranchPlaybackAccess.hlsUrl}
            branchName={user.branchName}
            username={user.username}
            watermark={user.watermark}
            showWatermarkOverlay={false}
            requireManualStart
            manualStartDelayMs={branchManualStartDelayMs}
            onPlaybackStateChange={setPlayerState}
          />
        ) : null}
      </div>
    </div>
  );
}
