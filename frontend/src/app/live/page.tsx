"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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

function formatDateTime(value: string | null) {
  if (!value) return "확인 중";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "확인 중";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

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
      message: "방송이 시작되면 자동으로 시청 준비 상태로 바뀝니다."
    };
  }

  if (playerState.status === "error") {
    return {
      label: "재생 오류",
      className: "risk-badge risk-high",
      message: "재생에 문제가 있습니다. 다시 시도해 주세요."
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
    message: "방송이 시작되면 자동으로 시청 준비 상태로 바뀝니다."
  };
}

function buildAdminStatusMeta(playerState: PlaybackState, streamStatus: StreamStatus | null, error: string | null): StatusMeta {
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

  if (!isPublishing && !playbackAvailable) {
    return {
      label: "송출 없음",
      className: "risk-badge risk-medium",
      message: "현재 송출 중인 방송이 없습니다."
    };
  }

  if (playerState.status === "error") {
    return {
      label: "재생 오류",
      className: "risk-badge risk-high",
      message: "재생 오류가 발생했습니다. 스트림 상태를 확인해 주세요."
    };
  }

  if (playerState.status === "playing") {
    return {
      label: "송출 중",
      className: "risk-badge risk-low",
      message: "방송이 정상적으로 재생되고 있습니다."
    };
  }

  if (playerState.status === "loading") {
    return {
      label: "재생 준비 중",
      className: "risk-badge risk-medium",
      message: "방송 연결 상태를 확인하고 있습니다."
    };
  }

  if (playbackAvailable || isPublishing) {
    return {
      label: "재생 대기",
      className: "risk-badge risk-medium",
      message: "방송이 준비되었습니다. 재생 버튼을 눌러 확인해 주세요."
    };
  }

  return {
    label: "재생 준비 중",
    className: "risk-badge risk-medium",
    message: "방송 연결 상태를 확인하고 있습니다."
  };
}

export default function LivePage() {
  const pathname = usePathname();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const isSuperAdmin = user?.roleCode === "SUPER_ADMIN";

  const [playbackAccess, setPlaybackAccess] = useState<PlaybackAccess | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [playerState, setPlayerState] = useState<PlaybackState>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [showStoppedNotice, setShowStoppedNotice] = useState(false);
  const [playerRenderKey, setPlayerRenderKey] = useState(0);

  const requestedForCurrentStreamRef = useRef(false);
  const previousLiveSignalRef = useRef(false);

  const isPublishing = Boolean(streamStatus?.isPublishing);
  const playbackAvailable = Boolean(streamStatus?.playbackAvailable);
  const hasLiveSignal = isPublishing || playbackAvailable;

  useEffect(() => {
    if (!userId) return;

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
  }, [userId]);

  useEffect(() => {
    requestedForCurrentStreamRef.current = false;
    setPlaybackAccess(null);
    setPlayerState({ status: "idle" });
    setError(null);
    setShowStoppedNotice(false);
    setPlayerRenderKey((current) => current + 1);
    previousLiveSignalRef.current = false;
  }, [pathname]);

  useEffect(() => {
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
  }, [hasLiveSignal, playbackAccess, playerState.status]);

  useEffect(() => {
    if (!user || !userId || pathname !== "/live") return;
    if (!hasLiveSignal || playbackAccess || requestedForCurrentStreamRef.current) return;

    const accessToken = window.localStorage.getItem("febc_live_access_token");
    if (!accessToken) {
      setError("로그인 세션을 찾을 수 없습니다.");
      return;
    }

    let cancelled = false;

    const loadPlaybackAccess = async () => {
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

    return () => {
      cancelled = true;
    };
  }, [hasLiveSignal, pathname, playbackAccess, user, userId]);

  useEffect(() => {
    if (playerState.status === "playing") {
      setShowStoppedNotice(false);
    }
  }, [playerState.status]);

  const statusMeta = useMemo(() => {
    if (isSuperAdmin) {
      return buildAdminStatusMeta(playerState, streamStatus, error);
    }

    return buildBranchStatusMeta({
      playerState,
      streamStatus,
      playbackAccess,
      error,
      showStoppedNotice
    });
  }, [error, isSuperAdmin, playbackAccess, playerState, showStoppedNotice, streamStatus]);

  if (!user) {
    return null;
  }

  const shouldRenderAdminPlayer = Boolean(playbackAvailable && playbackAccess);
  const shouldRenderBranchPlayer = Boolean(hasLiveSignal && playbackAccess);
  const resolvedAdminPlaybackAccess = shouldRenderAdminPlayer ? playbackAccess : null;
  const resolvedBranchPlaybackAccess = shouldRenderBranchPlayer ? playbackAccess : null;

  return (
    <div className="page-wrap">
      <PageHeader
        title="라이브 시청"
        subtitle={isSuperAdmin ? "실시간 방송 상태를 확인하고 모니터링합니다." : "내부 방송을 시청합니다."}
      />

      {isSuperAdmin ? (
        <div className="grid two">
          <div className="panel">
            <div className="panel-header-inline">
              <div className="panel-title">라이브 화면</div>
              <span className={statusMeta.className}>{statusMeta.label}</span>
            </div>
            <div className="stream-status-copy">{statusMeta.message}</div>
            {resolvedAdminPlaybackAccess ? (
              <LivePlayer
                key={`live-admin-${playerRenderKey}-${resolvedAdminPlaybackAccess.expiresAt}`}
                src={resolvedAdminPlaybackAccess.hlsUrl}
                branchName={user.branchName}
                username={user.username}
                watermark={user.watermark}
                onPlaybackStateChange={setPlayerState}
              />
            ) : null}
          </div>

          <div className="panel">
            <div className="panel-title">재생 정보</div>
            <div className="stack muted">
              <div className="content-break">현재 스트림 이름: main</div>
              <div className="content-break">현재 상태: {statusMeta.label}</div>
              <div className="content-break">마지막 스트림 확인 시각: {formatDateTime(streamStatus?.lastSegmentSeenAt ?? null)}</div>
              <div className="content-break">현재 시청 중 사용자: {streamStatus?.activeViewerCount ?? 0}명</div>
              <div className="content-break">재생 가능 여부: {streamStatus?.playbackAvailable ? "재생 가능" : "확인 필요"}</div>
              <div className="content-break">OBS 송출 예시: rtmp://localhost:1935/live/main</div>
            </div>
          </div>
        </div>
      ) : (
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
              requireManualStart
              manualStartDelayMs={10000}
              onPlaybackStateChange={setPlayerState}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
