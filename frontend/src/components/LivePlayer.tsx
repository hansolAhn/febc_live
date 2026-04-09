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
  showWatermarkOverlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  requireManualStart?: boolean;
  manualStartDelayMs?: number;
  onPlaybackStateChange?: (state: PlaybackState) => void;
};

const HLS_ERROR_MESSAGE = "재생 오류가 발생했습니다. 다시 시도해 주세요.";
const UNSUPPORTED_HLS_MESSAGE = "이 브라우저는 라이브 재생을 지원하지 않습니다.";
const STARTUP_STALL_TIMEOUT_MS = 10000;

export function LivePlayer({
  src,
  branchName,
  username,
  watermark,
  showWatermarkOverlay = true,
  controls = true,
  muted = false,
  requireManualStart = false,
  manualStartDelayMs = 0,
  onPlaybackStateChange
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const startedRef = useRef(false);
  const hasPlayedRef = useRef(false);
  const stallTimerRef = useRef<number | null>(null);
  const attachAttemptRef = useRef(0);
  const manualStartDelayTimerRef = useRef<number | null>(null);

  const [hasStarted, setHasStarted] = useState(!requireManualStart);
  const [manualStartReady, setManualStartReady] = useState(!requireManualStart || manualStartDelayMs <= 0);
  const [isStartupLoading, setIsStartupLoading] = useState(false);
  const [videoMountKey, setVideoMountKey] = useState(0);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    startedRef.current = !requireManualStart;
    hasPlayedRef.current = false;
    setHasStarted(!requireManualStart);
    setManualStartReady(!requireManualStart || manualStartDelayMs <= 0);
    setIsStartupLoading(false);
    setLastErrorMessage(null);
    setVideoMountKey(0);
  }, [manualStartDelayMs, requireManualStart, src]);

  useEffect(() => {
    if (!requireManualStart || manualStartDelayMs <= 0) {
      setManualStartReady(true);
      return;
    }

    setManualStartReady(false);
    manualStartDelayTimerRef.current = window.setTimeout(() => {
      manualStartDelayTimerRef.current = null;
      setManualStartReady(true);
    }, manualStartDelayMs);

    return () => {
      if (manualStartDelayTimerRef.current !== null) {
        window.clearTimeout(manualStartDelayTimerRef.current);
        manualStartDelayTimerRef.current = null;
      }
    };
  }, [manualStartDelayMs, requireManualStart, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const emit = (state: PlaybackState) => {
      onPlaybackStateChange?.(state);
    };

    const clearStallTimer = () => {
      if (stallTimerRef.current !== null) {
        window.clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };

    const cleanup = () => {
      clearStallTimer();
      if (manualStartDelayTimerRef.current !== null) {
        window.clearTimeout(manualStartDelayTimerRef.current);
        manualStartDelayTimerRef.current = null;
      }

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

    const startStallTimer = (attemptId: number) => {
      clearStallTimer();
      stallTimerRef.current = window.setTimeout(() => {
        if (!startedRef.current || hasPlayedRef.current || attachAttemptRef.current !== attemptId) {
          return;
        }

        setIsStartupLoading(false);
        setLastErrorMessage(HLS_ERROR_MESSAGE);
        emit({ status: "error", message: HLS_ERROR_MESSAGE });
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

        setIsStartupLoading(false);
        setLastErrorMessage(HLS_ERROR_MESSAGE);
        emit({ status: "error", message: HLS_ERROR_MESSAGE });
      }
    };

    const attachSource = () => {
      clearStallTimer();
      setLastErrorMessage(null);

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
            clearStallTimer();
            setIsStartupLoading(false);
            setLastErrorMessage(HLS_ERROR_MESSAGE);
            emit({ status: "error", message: HLS_ERROR_MESSAGE });
          }
        });

        return;
      }

      clearStallTimer();
      setIsStartupLoading(false);
      emit({ status: "error", message: UNSUPPORTED_HLS_MESSAGE });
    };

    const handlePlaying = () => {
      hasPlayedRef.current = true;
      clearStallTimer();
      setIsStartupLoading(false);
      setLastErrorMessage(null);
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
        clearStallTimer();
        setIsStartupLoading(false);
        setLastErrorMessage(HLS_ERROR_MESSAGE);
        emit({ status: "error", message: HLS_ERROR_MESSAGE });
        return;
      }

      setIsStartupLoading(false);
      setLastErrorMessage(HLS_ERROR_MESSAGE);
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
    setLastErrorMessage(null);
    setVideoMountKey((current) => current + 1);
    setHasStarted(true);
  };

  const showManualStartButton = requireManualStart && manualStartReady && !hasStarted;
  const showLoadingOverlay = ((requireManualStart && !manualStartReady) || isStartupLoading) && !hasPlayedRef.current;
  const showErrorOverlay = Boolean(lastErrorMessage) && !showLoadingOverlay;

  return (
    <div className="player-frame">
      <video key={videoMountKey} ref={videoRef} />
      {showWatermarkOverlay ? (
        <WatermarkOverlay branchName={branchName} username={username} watermark={watermark} />
      ) : null}
      {showLoadingOverlay ? (
        <div className="player-loading-overlay">
          <div className="player-loading-content">
            <div className="player-loading-spinner" />
            <div className="player-loading-text">
              {requireManualStart && !manualStartReady
                ? "재생 준비 중입니다. 잠시만 기다려 주세요."
                : "방송 재생을 준비하고 있습니다."}
            </div>
          </div>
        </div>
      ) : null}
      {showManualStartButton ? (
        <button type="button" className="player-overlay-button" onClick={handleManualStart} aria-label="재생">
          <span className="player-overlay-icon">▶</span>
        </button>
      ) : null}
      {showErrorOverlay ? (
        <div className="player-loading-overlay">
          <div className="player-loading-content">
            <div className="player-loading-text">재생 중 오류가 발생했습니다. 새로고침 후 다시 이용해주세요.</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
