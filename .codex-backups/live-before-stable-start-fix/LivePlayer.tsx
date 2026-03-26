"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { WatermarkOverlay } from "@/components/WatermarkOverlay";
import type { WatermarkPayload } from "@/lib/mock-api";

export type PlaybackState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "manual-start-required" }
  | { status: "playing" }
  | { status: "error"; message: string };

type LivePlayerProps = {
  src: string;
  branchName: string;
  username: string;
  watermark: WatermarkPayload;
  controls?: boolean;
  muted?: boolean;
  requireManualStart?: boolean;
  onPlaybackStateChange?: (state: PlaybackState) => void;
};

const HLS_ERROR_MESSAGE = "재생 오류가 발생했습니다. 다시 시도해 주세요.";
const STARTUP_RETRY_LIMIT = 6;
const STARTUP_RETRY_DELAY_MS = 1200;
const STARTUP_STALL_TIMEOUT_MS = 2500;

export function LivePlayer({
  src,
  branchName,
  username,
  watermark,
  controls = false,
  muted = false,
  requireManualStart = false,
  onPlaybackStateChange
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const startedRef = useRef(false);
  const hasPlayedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const stallTimerRef = useRef<number | null>(null);
  const attachAttemptRef = useRef(0);
  const [hasStarted, setHasStarted] = useState(!requireManualStart);
  const [isStartupLoading, setIsStartupLoading] = useState(false);
  const [videoMountKey, setVideoMountKey] = useState(0);

  useEffect(() => {
    startedRef.current = !requireManualStart;
    hasPlayedRef.current = false;
    retryCountRef.current = 0;
    setHasStarted(!requireManualStart);
    setIsStartupLoading(false);
    setVideoMountKey(0);
  }, [requireManualStart, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const emit = (state: PlaybackState) => {
      onPlaybackStateChange?.(state);
    };

    const clearRetryTimer = () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const clearStallTimer = () => {
      if (stallTimerRef.current !== null) {
        window.clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };

    const cleanup = () => {
      clearRetryTimer();
      clearStallTimer();

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      video.pause();
      video.removeAttribute("src");
      video.load();
      hasPlayedRef.current = false;
      setIsStartupLoading(false);
    };

    const scheduleRetry = () => {
      if (!startedRef.current || hasPlayedRef.current) {
        return;
      }

      if (retryCountRef.current >= STARTUP_RETRY_LIMIT) {
        setIsStartupLoading(false);
        emit({ status: "error", message: HLS_ERROR_MESSAGE });
        return;
      }

      retryCountRef.current += 1;
      setIsStartupLoading(true);
      emit({ status: "loading" });
      clearRetryTimer();
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        setVideoMountKey((current) => current + 1);
      }, STARTUP_RETRY_DELAY_MS);
    };

    const startStallTimer = (attemptId: number) => {
      clearStallTimer();
      stallTimerRef.current = window.setTimeout(() => {
        if (!startedRef.current || hasPlayedRef.current || attachAttemptRef.current !== attemptId) {
          return;
        }

        scheduleRetry();
      }, STARTUP_STALL_TIMEOUT_MS);
    };

    const attemptPlayback = async () => {
      try {
        emit({ status: "ready" });
        await video.play();
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          startedRef.current = false;
          setHasStarted(false);
          setIsStartupLoading(false);
          emit({ status: "manual-start-required" });
          return;
        }

        scheduleRetry();
      }
    };

    const attachSource = () => {
      clearRetryTimer();
      clearStallTimer();

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      video.pause();
      video.removeAttribute("src");
      video.load();
      hasPlayedRef.current = false;

      if (!hasStarted) {
        setIsStartupLoading(false);
        emit({ status: "manual-start-required" });
        return;
      }

      const attemptId = attachAttemptRef.current + 1;
      attachAttemptRef.current = attemptId;
      setIsStartupLoading(true);
      emit({ status: "loading" });
      startStallTimer(attemptId);

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        void attemptPlayback();
        return;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          autoStartLoad: true,
          enableWorker: true
        });

        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (attachAttemptRef.current !== attemptId) {
            return;
          }

          void attemptPlayback();
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (attachAttemptRef.current !== attemptId) {
            return;
          }

          if (data.fatal) {
            scheduleRetry();
          }
        });

        return;
      }

      clearStallTimer();
      setIsStartupLoading(false);
      emit({ status: "error", message: "이 브라우저는 라이브 재생을 지원하지 않습니다." });
    };

    const handlePlaying = () => {
      hasPlayedRef.current = true;
      retryCountRef.current = 0;
      clearRetryTimer();
      clearStallTimer();
      setIsStartupLoading(false);
      emit({ status: "playing" });
    };

    const handleWaiting = () => {
      if (startedRef.current && !hasPlayedRef.current) {
        setIsStartupLoading(true);
        emit({ status: "loading" });
      }
    };

    const handlePause = () => {
      if (startedRef.current && !video.ended) {
        setIsStartupLoading(false);
        emit({ status: "ready" });
      }
    };

    const handleError = () => {
      if (!hasPlayedRef.current && startedRef.current) {
        scheduleRetry();
        return;
      }

      setIsStartupLoading(false);
      emit({ status: "error", message: HLS_ERROR_MESSAGE });
    };

    video.muted = muted;
    video.playsInline = true;
    video.controls = controls;
    video.preload = "auto";

    video.addEventListener("playing", handlePlaying);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);

    attachSource();

    return () => {
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
      cleanup();
    };
  }, [controls, hasStarted, muted, onPlaybackStateChange, src, videoMountKey]);

  const handleManualStart = () => {
    startedRef.current = true;
    retryCountRef.current = 0;
    setVideoMountKey((current) => current + 1);
    setHasStarted(true);
  };

  const showManualStartButton = requireManualStart && !hasStarted;
  const showLoadingOverlay = isStartupLoading && !hasPlayedRef.current;

  return (
    <div className="player-frame">
      <video key={videoMountKey} ref={videoRef} />
      <WatermarkOverlay branchName={branchName} username={username} watermark={watermark} />
      {showLoadingOverlay ? (
        <div className="player-loading-overlay">
          <div className="player-loading-content">
            <div className="player-loading-spinner" />
            <div className="player-loading-text">방송 재생을 준비하고 있습니다.</div>
          </div>
        </div>
      ) : null}
      {showManualStartButton ? (
        <button type="button" className="player-overlay-button" onClick={handleManualStart} aria-label="재생">
          <span className="player-overlay-icon">▶</span>
        </button>
      ) : null}
    </div>
  );
}
