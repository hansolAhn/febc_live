"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as mockApi from "@/lib/mock-api";
import { useAuth } from "./providers/AuthProvider";

const DUPLICATE_LOGIN_MESSAGE = "이미 이 계정으로 로그인 중입니다. 기존 세션을 종료한 뒤 다시 시도해 주세요.";
const UNREGISTERED_DEVICE_MESSAGE = "등록되지 않은 기기입니다. 관리자 확인 후 로그인할 수 있습니다.";
const BLOCKED_DEVICE_MESSAGE = "차단된 기기입니다. 관리자에게 문의해 주세요.";
const DEVICE_FINGERPRINT_STORAGE_KEY = "febc_live_device_fingerprint";

function buildDetectedDeviceLabel() {
  if (typeof window === "undefined") {
    return "현재 브라우저 기기";
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const browser = userAgent.includes("edg/")
    ? "Edge"
    : userAgent.includes("chrome/")
      ? "Chrome"
      : userAgent.includes("safari/") && !userAgent.includes("chrome/")
        ? "Safari"
        : userAgent.includes("firefox/")
          ? "Firefox"
          : "Browser";
  const os = userAgent.includes("windows")
    ? "Windows"
    : userAgent.includes("android")
      ? "Android"
      : userAgent.includes("iphone") || userAgent.includes("ipad")
        ? "iOS"
        : userAgent.includes("mac os")
          ? "macOS"
          : "OS";

  return `${browser} ${os} 자동 감지`;
}

function resolveFingerprint() {
  if (typeof window === "undefined") {
    return "device-fp-001";
  }

  const saved = window.localStorage.getItem(DEVICE_FINGERPRINT_STORAGE_KEY);
  if (saved) {
    return saved;
  }

  const generated = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `device-${Date.now()}`;
  window.localStorage.setItem(DEVICE_FINGERPRINT_STORAGE_KEY, generated);
  return generated;
}

function formatSecondsLabel(seconds: number) {
  if (seconds <= 0) {
    return "지금 다시 요청 가능합니다.";
  }

  return `${seconds}초 뒤 다시 요청 가능합니다.`;
}

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({
    username: "branch_admin",
    password: "pass1234",
    otpCode: "123456",
    deviceFingerprint: "device-fp-001",
    deviceLabel: "HQ Chrome Windows"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0);
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState(0);

  const showDuplicateLoginModal = errorMessage.includes(DUPLICATE_LOGIN_MESSAGE);
  const showUnregisteredDeviceGuide = errorMessage.includes(UNREGISTERED_DEVICE_MESSAGE);
  const showBlockedDeviceGuide = errorMessage.includes(BLOCKED_DEVICE_MESSAGE);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      deviceFingerprint: resolveFingerprint(),
      deviceLabel: buildDetectedDeviceLabel()
    }));
  }, []);

  useEffect(() => {
    if (otpCooldownSeconds <= 0 && otpExpiresInSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setOtpCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
      setOtpExpiresInSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpCooldownSeconds, otpExpiresInSeconds]);

  const otpGuide = useMemo(() => {
    if (!infoMessage && otpExpiresInSeconds <= 0) {
      return "";
    }

    const parts = [];
    if (infoMessage) {
      parts.push(infoMessage);
    }
    if (otpExpiresInSeconds > 0) {
      parts.push(`인증번호는 ${otpExpiresInSeconds}초 동안 유효합니다.`);
    }
    if (otpCooldownSeconds > 0) {
      parts.push(formatSecondsLabel(otpCooldownSeconds));
    }
    return parts.join(" ");
  }, [infoMessage, otpCooldownSeconds, otpExpiresInSeconds]);

  async function submitLogin(forceLogin = false) {
    setIsLoading(true);
    setErrorMessage("");

    try {
      await login({ ...form, forceLogin });
      router.push("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function requestOtp() {
    setIsSendingOtp(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const response = await mockApi.requestLoginOtp({
        username: form.username,
        password: form.password
      });

      setInfoMessage(response.message);
      setOtpCooldownSeconds(response.cooldownSeconds);
      setOtpExpiresInSeconds(response.expiresInSeconds);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "OTP 발송에 실패했습니다.");
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitLogin(false);
  }

  return (
    <>
      <form className="form-grid" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="username">아이디</label>
          <input className="input" id="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">비밀번호</label>
          <input className="input" id="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="otpCode">문자 OTP</label>
          <input className="input" id="otpCode" value={form.otpCode} onChange={(event) => setForm({ ...form, otpCode: event.target.value })} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            className="button secondary"
            disabled={isSendingOtp || isLoading || otpCooldownSeconds > 0}
            onClick={() => void requestOtp()}
            type="button"
          >
            {isSendingOtp ? "OTP 발송 중.." : otpCooldownSeconds > 0 ? `OTP 다시 받기 (${otpCooldownSeconds})` : "OTP 다시 받기"}
          </button>
          {otpCooldownSeconds > 0 ? <span className="muted">{formatSecondsLabel(otpCooldownSeconds)}</span> : null}
        </div>
        <div>
          <label className="label" htmlFor="deviceLabel">기기 이름</label>
          <input className="input" id="deviceLabel" value={form.deviceLabel} readOnly />
        </div>

        {otpGuide ? <div className="muted" style={{ color: "#1f8a5b" }}>{otpGuide}</div> : null}

        {showUnregisteredDeviceGuide ? (
          <div className="panel" style={{ padding: 14, background: "#fff8ee" }}>
            <div className="panel-title">관리자 확인 대기 기기입니다.</div>
            <div className="muted" style={{ marginTop: 6 }}>
              이 기기는 아직 승인되지 않았습니다. 관리자가 계정/기기 관리 화면에서 승인하면 로그인할 수 있습니다.
            </div>
          </div>
        ) : null}

        {showBlockedDeviceGuide ? (
          <div className="panel" style={{ padding: 14, background: "#fff2f2" }}>
            <div className="panel-title">차단된 기기입니다.</div>
            <div className="muted" style={{ marginTop: 6 }}>
              현재 기기는 차단 상태입니다. 다른 승인된 기기를 사용하거나 관리자에게 차단 해제를 요청해 주세요.
            </div>
          </div>
        ) : null}

        {!showDuplicateLoginModal && errorMessage && !showUnregisteredDeviceGuide && !showBlockedDeviceGuide ? (
          <div className="muted" style={{ color: "#c14040" }}>{errorMessage}</div>
        ) : null}

        <button className="button primary" disabled={isLoading} type="submit">
          {isLoading ? "로그인 중.." : "로그인"}
        </button>
      </form>

      {showDuplicateLoginModal ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.28)", display: "grid", placeItems: "center", padding: 24, zIndex: 1000 }}>
          <div className="panel" style={{ width: "min(460px, 100%)" }}>
            <div className="panel-title">이미 로그인 중입니다</div>
            <div className="muted" style={{ marginTop: 8 }}>
              같은 계정이 현재 다른 창 또는 다른 기기에서 사용 중입니다.
              <br />
              기존 세션을 종료하고 지금 이 창으로 로그인할 수 있습니다.
            </div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button className="button secondary" onClick={() => setErrorMessage("")} type="button">
                취소
              </button>
              <button className="button primary" disabled={isLoading} onClick={() => void submitLogin(true)} type="button">
                기존 세션 종료 후 로그인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
