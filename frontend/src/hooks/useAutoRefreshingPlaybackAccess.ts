"use client";

import { useEffect } from "react";
import * as mockApi from "@/lib/mock-api";

type PlaybackAccess = Awaited<ReturnType<typeof mockApi.fetchPlaybackAccess>>;

type UseAutoRefreshingPlaybackAccessOptions = {
  enabled: boolean;
  accessToken: string | null;
  stream?: string;
  playbackAccess: PlaybackAccess | null;
  onRefreshSuccess: (nextAccess: PlaybackAccess) => void;
  onRefreshError: (message: string) => void;
};

const PLAYBACK_TOKEN_REFRESH_LEAD_MS = 30_000;
const PLAYBACK_TOKEN_REFRESH_RETRY_MS = 5_000;

export function useAutoRefreshingPlaybackAccess({
  enabled,
  accessToken,
  stream = "main",
  playbackAccess,
  onRefreshSuccess,
  onRefreshError
}: UseAutoRefreshingPlaybackAccessOptions) {
  useEffect(() => {
    if (!enabled || !accessToken || !playbackAccess?.expiresAt) {
      return;
    }

    let cancelled = false;
    let refreshTimer: number | null = null;

    const scheduleRefresh = (delayMs: number) => {
      refreshTimer = window.setTimeout(async () => {
        try {
          const nextAccess = await mockApi.fetchPlaybackAccess(accessToken, stream);
          if (cancelled) {
            return;
          }

          onRefreshSuccess(nextAccess);
        } catch (error) {
          if (cancelled) {
            return;
          }

          onRefreshError(error instanceof Error ? error.message : "재생 권한을 갱신하지 못했습니다.");
          scheduleRefresh(PLAYBACK_TOKEN_REFRESH_RETRY_MS);
        }
      }, delayMs);
    };

    const expiresAtMs = new Date(playbackAccess.expiresAt).getTime();
    const refreshDelayMs = Number.isNaN(expiresAtMs)
      ? PLAYBACK_TOKEN_REFRESH_RETRY_MS
      : Math.max(expiresAtMs - Date.now() - PLAYBACK_TOKEN_REFRESH_LEAD_MS, 1_000);

    scheduleRefresh(refreshDelayMs);

    return () => {
      cancelled = true;
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
    };
  }, [accessToken, enabled, onRefreshError, onRefreshSuccess, playbackAccess, stream]);
}
