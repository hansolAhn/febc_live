"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActiveSessionTable } from "@/components/ActiveSessionTable";
import { LivePlayer, PlaybackState } from "@/components/LivePlayer";
import { PageHeader } from "@/components/PageHeader";
import { SecurityEventTable } from "@/components/SecurityEventTable";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/components/providers/AuthProvider";
import * as mockApi from "@/lib/mock-api";

type PlaybackAccess = Awaited<ReturnType<typeof mockApi.fetchPlaybackAccess>>;
type StreamStatus = Awaited<ReturnType<typeof mockApi.fetchStreamStatus>>;

function formatDateTime(value: string | null) {
  if (!value) return "확인 전";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "확인 전";

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

function buildStatusMeta(playerState: PlaybackState, streamStatus: StreamStatus | null, error: string | null) {
  if (error?.includes("Session") || error?.includes("session")) {
    return {
      label: "세션 종료",
      className: "risk-badge risk-high",
      message: "관리자 세션이 종료되었습니다. 다시 로그인해 주세요."
    };
  }

  if (error?.includes("expired") || error?.includes("Playback token")) {
    return {
      label: "권한 만료",
      className: "risk-badge risk-high",
      message: "재생 권한이 만료되었습니다. 다시 로그인해 주세요."
    };
  }

  if (playerState.status === "playing") {
    return {
      label: "송출 중",
      className: "risk-badge risk-low",
      message: "방송이 정상적으로 재생되고 있습니다."
    };
  }

  if (playerState.status === "manual-start-required") {
    return {
      label: streamStatus?.playbackAvailable || streamStatus?.isPublishing ? "재생 대기" : "송출 확인 중",
      className: "risk-badge risk-medium",
      message:
        streamStatus?.playbackAvailable || streamStatus?.isPublishing
          ? "방송은 송출 중입니다. 재생 버튼을 눌러 모니터링할 수 있습니다."
          : "송출 상태를 확인하는 중입니다."
    };
  }

  if (playerState.status === "error") {
    return {
      label: "재생 오류",
      className: "risk-badge risk-high",
      message: playerState.message
    };
  }

  if (
    streamStatus?.playbackAvailable ||
    streamStatus?.isPublishing ||
    playerState.status === "ready" ||
    playerState.status === "loading"
  ) {
    return {
      label: "송출 중",
      className: "risk-badge risk-low",
      message: "방송 송출은 정상입니다. 재생 버튼을 눌러 모니터링할 수 있습니다."
    };
  }

  return {
    label: "송출 없음",
    className: "risk-badge risk-medium",
    message: "현재 송출 중인 방송이 없습니다."
  };
}

export default function DashboardPage() {
  const dashboardWarmupSessionKey = "febc-dashboard-admin-warmup-complete";
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const roleCode = user?.roleCode ?? null;

  const [metrics, setMetrics] = useState({ activeBranches: 0, activeSessions: 0, highRiskEvents: 0, trackedDevices: 0 });
  const [events, setEvents] = useState<Awaited<ReturnType<typeof mockApi.fetchSecurityEvents>>>([]);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof mockApi.fetchSessions>>>([]);
  const [playbackAccess, setPlaybackAccess] = useState<PlaybackAccess | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PlaybackState>({ status: "idle" });
  const [playerRenderKey, setPlayerRenderKey] = useState(0);
  const [manualStartDelayMs, setManualStartDelayMs] = useState(15000);

  const requestedPreviewAccessRef = useRef(false);
  const hasLiveSignal = Boolean(streamStatus?.isPublishing || streamStatus?.playbackAvailable);

  useEffect(() => {
    if (!user || !userId) return;
    if (roleCode !== "SUPER_ADMIN") {
      router.replace("/live");
      return;
    }

    let cancelled = false;

    async function loadDashboardData() {
      const [nextMetrics, nextEvents, nextSessions] = await Promise.all([
        mockApi.fetchDashboardMetrics(),
        mockApi.fetchSecurityEvents(),
        mockApi.fetchSessions()
      ]);

      if (!cancelled) {
        setMetrics(nextMetrics);
        setEvents(nextEvents);
        setSessions(nextSessions);
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [roleCode, router, user, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || roleCode !== "SUPER_ADMIN") {
      return;
    }

    if (window.sessionStorage.getItem(dashboardWarmupSessionKey) === "ready") {
      setManualStartDelayMs(0);
      return;
    }

    setManualStartDelayMs(15000);
  }, [dashboardWarmupSessionKey, roleCode]);

  useEffect(() => {
    if (!userId || roleCode !== "SUPER_ADMIN") return;

    let cancelled = false;

    async function loadStreamStatus() {
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
    }

    void loadStreamStatus();
    const timer = window.setInterval(() => {
      void loadStreamStatus();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roleCode, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || roleCode !== "SUPER_ADMIN" || streamStatus === null) {
      return;
    }

    if (!hasLiveSignal) {
      window.sessionStorage.removeItem(dashboardWarmupSessionKey);
      setManualStartDelayMs(15000);
      return;
    }

    if (window.sessionStorage.getItem(dashboardWarmupSessionKey) === "ready") {
      setManualStartDelayMs(0);
      return;
    }

    setManualStartDelayMs(15000);
  }, [dashboardWarmupSessionKey, hasLiveSignal, roleCode, streamStatus]);

  useEffect(() => {
    if (!user || !userId || roleCode !== "SUPER_ADMIN") return;

    if (!hasLiveSignal) {
      requestedPreviewAccessRef.current = false;
      if (playbackAccess) {
        setPlaybackAccess(null);
        setPreviewState({ status: "idle" });
        setPlayerRenderKey((current) => current + 1);
      }
      return;
    }

    if (playbackAccess || requestedPreviewAccessRef.current) {
      return;
    }

    const accessToken = window.localStorage.getItem("febc_live_access_token");
    if (!accessToken) {
      const message = "재생 세션이 없어 라이브 미리보기를 불러올 수 없습니다.";
      setPreviewError(message);
      setPreviewState({ status: "error", message });
      return;
    }
    const resolvedAccessToken = accessToken;

    let cancelled = false;

    async function loadPlaybackAccess() {
      try {
        const response = await mockApi.fetchPlaybackAccess(resolvedAccessToken, "main");
        if (!cancelled) {
          requestedPreviewAccessRef.current = true;
          setPlaybackAccess(response);
          setPreviewState({ status: "ready" });
          setPreviewError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          requestedPreviewAccessRef.current = false;
          const message = loadError instanceof Error ? loadError.message : "라이브 미리보기를 불러오지 못했습니다.";
          setPreviewError(message);
          setPreviewState({ status: "error", message });
        }
      }
    }

    void loadPlaybackAccess();

    return () => {
      cancelled = true;
    };
  }, [hasLiveSignal, playbackAccess, roleCode, user, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || roleCode !== "SUPER_ADMIN") {
      return;
    }

    if (!hasLiveSignal || !playbackAccess) {
      return;
    }

    if (manualStartDelayMs === 0) {
      window.sessionStorage.setItem(dashboardWarmupSessionKey, "ready");
      return;
    }

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(dashboardWarmupSessionKey, "ready");
    }, manualStartDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dashboardWarmupSessionKey, hasLiveSignal, manualStartDelayMs, playbackAccess, roleCode]);

  const previewMeta = useMemo(() => buildStatusMeta(previewState, streamStatus, previewError), [previewError, previewState, streamStatus]);
  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === "사용 중" || session.status === "접속 중"),
    [sessions]
  );

  if (!user || roleCode !== "SUPER_ADMIN") {
    return null;
  }

  const previewAccess = hasLiveSignal && playbackAccess ? playbackAccess : null;

  return (
    <div className="page-wrap">
      <PageHeader title="관리자 대시보드" subtitle="운영 현황, 최근 보안 이벤트, 현재 송출 상태를 한 화면에서 확인합니다." />

      <div className="metrics">
        <StatCard
          label="현재 접속 현황"
          value={String(metrics.activeSessions)}
          detail={`접속 지사 ${metrics.activeBranches}곳 / 사용 중 세션 ${metrics.activeSessions}개`}
          href="/security-events?tab=sessions"
        />
        <StatCard label="고위험 보안 알림" value={String(metrics.highRiskEvents)} detail="즉시 확인이 필요한 경고 수" href="/security-events?tab=events" />
        <StatCard label="관리 중인 기기" value={String(metrics.trackedDevices)} detail="확인 또는 검토 대상 기기 수" href="/security-events?tab=devices" />
      </div>

      <div className="grid two dashboard-main-grid">
        <div className="panel dashboard-live-panel">
          <div className="panel-header-inline">
            <div className="panel-title">라이브 상태</div>
            <span className={previewMeta.className}>{previewMeta.label}</span>
          </div>
          <div className="stream-status-copy">{previewMeta.message}</div>
          {previewAccess ? (
            <LivePlayer
              key={`dashboard-preview-${playerRenderKey}-${previewAccess.expiresAt}`}
              src={previewAccess.hlsUrl}
              branchName={user.branchName}
              username={user.username}
              watermark={user.watermark}
              controls
              muted={false}
              requireManualStart
              manualStartDelayMs={manualStartDelayMs}
              onPlaybackStateChange={setPreviewState}
            />
          ) : (
            <div className="stack muted">
            <div>{previewError ?? "라이브 미리보기를 준비하는 중입니다..."}</div>
            </div>
          )}
        </div>
        <ActiveSessionTable
          sessions={activeSessions}
          compact
          title="현재 접속 세션"
          className="dashboard-session-panel"
          summary={`${activeSessions.length}개 접속 중`}
        />
      </div>

      <div className="grid two dashboard-bottom-grid">
        <div className="panel">
          <div className="panel-header-inline">
            <div className="panel-title">최근 보안 이벤트</div>
            <Link className="text-link" href="/security-events">
              전체 보기
            </Link>
          </div>
          <SecurityEventTable events={events.slice(0, 5)} />
        </div>
      </div>
    </div>
  );
}
