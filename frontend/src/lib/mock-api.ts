export type LogoSliceTransform = {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  skewX: number;
};

export type LogoVariantProfile = {
  code: string;
  branchSignature: string;
  deviceSignature: string;
  sessionAssistCode: string;
  slices: {
    f: LogoSliceTransform;
    e: LogoSliceTransform;
    b: LogoSliceTransform;
    c: LogoSliceTransform;
    box: LogoSliceTransform;
  };
};

export type LogoVariantAsset = {
  code: string;
  svgTemplate: string;
  assetPath?: string;
  displayName?: string;
  comparisonHints?: string[];
};

import {
  formatAuditPayload,
  formatSecurityEventDetail,
  mapAuditActionLabel,
  mapFailureReasonLabel,
  mapPolicyFieldLabel,
  mapSecurityEventTypeLabel,
  mapSeverityLabel
} from "@/lib/audit-formatters";

export type WatermarkPayload = {
  profileId: string;
  profileVersion: number;
  visibleWatermark: {
    logoVariant: string;
    microShift: string;
    tint: string;
    sessionCode: string;
    logoFingerprintCode: string;
    badgeVersion: string;
    deviceLabel: string;
    sessionAssistCode?: string;
    logoVariantProfile?: LogoVariantProfile;
    logoVariantSvgTemplate?: string;
  };
  hiddenForensicWatermark: {
    strategy: string;
    profileVersion: number;
    hiddenConfig: Record<string, unknown>;
  };
};

export type LoginPayload = {
  username: string;
  password: string;
  otpCode?: string;
  deviceFingerprint: string;
  deviceLabel: string;
  forceLogin?: boolean;
};

export type RequestLoginOtpPayload = {
  username: string;
  password: string;
};

export type CurrentUser = {
  id: string;
  username: string;
  roleCode: string;
  branchName: string;
  branchCode: string;
  deviceLabel: string;
  watermark: WatermarkPayload;
};

type LoginApiResponse = {
  accessToken: string;
  refreshToken: string;
  sessionKey: string;
  branch: { id: string; code: string; name: string };
  user: { id: string; username: string; roleCode: string };
  watermark: WatermarkPayload;
};

type MeApiResponse = {
  id: string;
  username: string;
  role?: { code?: string };
  branch?: { code?: string; name?: string };
  devices?: Array<{ deviceLabel?: string }>;
  watermark: WatermarkPayload;
};

type BranchPolicyResponse = {
  branch: { id: string; code: string; name: string };
  policy?: {
    id?: string;
    singleSessionOnly?: boolean;
    otpRequired?: boolean;
    deviceRegistrationRequired?: boolean;
  };
};

type UserPolicyResponse = {
  user: {
    id: string;
    username: string;
    branchId: string;
    roleId: string;
    isActive: boolean;
  };
  policy?: {
    id?: string;
    singleSessionOnly?: boolean;
    otpRequired?: boolean;
    deviceRegistrationRequired?: boolean;
  };
  allowedIps?: Array<{ cidr: string }>;
};

type PolicyCard = {
  id: string;
  field: "singleSessionOnly" | "otpRequired" | "deviceRegistrationRequired";
  title: string;
  description: string;
  enabled: boolean;
};

export type UserSummary = {
  id: string;
  username: string;
  branchCode: string;
  branchName: string;
  roleCode: string;
  phone: string;
  password: string;
  isActive: boolean;
};

export type BranchSummary = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type AuditLogsApiResponse = {
  auditLogs?: Array<Record<string, unknown>>;
  loginAttemptLogs?: Array<Record<string, unknown>>;
};

export type AuditLogItem = {
  id: string;
  createdAt: string;
  actionType: string;
  actionLabel: string;
  actorIp: string;
  branchId: string;
  branchLabel: string;
  payloadSummary: string;
};

export type LoginAttemptLogItem = {
  id: string;
  createdAt: string;
  username: string;
  attemptIp: string;
  succeeded: boolean;
  resultLabel: string;
  failureReason: string;
  failureReasonLabel: string;
  branchId: string;
  branchLabel: string;
};

type PlaybackAccessResponse = {
  stream: string;
  expiresAt: string;
  token: string;
  hlsUrl: string;
};

export type StreamStatus = {
  stream: string;
  isPublishing: boolean;
  playbackAvailable: boolean;
  lastPublishedAt: string | null;
  lastStoppedAt: string | null;
  lastSegmentSeenAt: string | null;
  activeViewerCount: number;
};

export type LeakageCandidateQuery = {
  sessionCodeFragment?: string;
  branchCode?: string;
  deviceId?: string;
  username?: string;
  auditActionType?: string;
};

export type LeakageCandidate = {
  id: string;
  userId: string;
  deviceId: string | null;
  deviceLabel: string | null;
  branchCode: string;
  branchName: string;
  username: string;
  sessionKey: string;
  sessionCodeTail: string;
  startedAt: string;
  status: string;
  statusLabel: string;
  ipAddress: string;
  matchedBy: string[];
  watermarkSummary: string;
  confidenceScore: number;
  recentAuditLogs: Array<{ createdAt: string; actionLabel: string; summary: string }>;
  recentSecurityEvents: Array<{ createdAt: string; severity: string; typeLabel: string; detail: string }>;
};

export type LeakageCandidateSearchResult = {
  summary: {
    totalCandidates: number;
    searchedBy: {
      sessionCodeFragment: string | null;
      branchCode: string | null;
      deviceId: string | null;
      username: string | null;
      auditActionType: string | null;
    };
  };
  candidates: LeakageCandidate[];
};

export type SessionSummary = Awaited<ReturnType<typeof fetchSessions>>[number];
export type DeviceSummary = Awaited<ReturnType<typeof fetchDevices>>[number];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

function parseApiErrorMessage(text: string, status: number) {
  if (!text) {
    return `API 요청 실패: ${status}`;
  }

  try {
    const parsed = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(", ");
    }

    if (typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    // Ignore non-JSON responses.
  }

  return text;
}

async function apiRequest<T>(path: string, init?: RequestInit, accessToken?: string): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseApiErrorMessage(text, response.status));
  }

  return response.json() as Promise<T>;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

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

function mapBranchLabel(branchIdOrCode: string) {
  if (branchIdOrCode === "branch-seoul" || branchIdOrCode === "seoul-hq") return "서울본사";
  if (branchIdOrCode === "branch-busan" || branchIdOrCode === "busan") return "부산지사";
  return branchIdOrCode || "-";
}

function mapLoginResponseToCurrentUser(response: LoginApiResponse, payload: LoginPayload): CurrentUser {
  return {
    id: response.user.id,
    username: response.user.username,
    roleCode: response.user.roleCode,
    branchName: response.branch.name,
    branchCode: response.branch.code,
    deviceLabel: payload.deviceLabel,
    watermark: response.watermark
  };
}

function mapMeResponseToCurrentUser(response: MeApiResponse): CurrentUser {
  return {
    id: response.id,
    username: response.username,
    roleCode: response.role?.code ?? "VIEWER",
    branchName: response.branch?.name ?? "알 수 없는 지사",
    branchCode: response.branch?.code ?? "unknown",
    deviceLabel: response.devices?.[0]?.deviceLabel ?? "알 수 없는 기기",
    watermark: response.watermark
  };
}

function buildPolicyCards(policy?: BranchPolicyResponse["policy"]): PolicyCard[] {
  return [
    {
      id: "single-session-only",
      field: "singleSessionOnly",
      title: "지사당 1세션 제한",
      description: "같은 지사 계정으로 동시에 접속하지 못하게 제한합니다.",
      enabled: Boolean(policy?.singleSessionOnly)
    },
    {
      id: "otp-required",
      field: "otpRequired",
      title: "문자 OTP 필수",
      description: "로그인할 때 문자 인증번호를 한 번 더 확인합니다.",
      enabled: Boolean(policy?.otpRequired)
    },
    {
      id: "registered-device-only",
      field: "deviceRegistrationRequired",
      title: "등록 기기만 허용",
      description: "등록되지 않은 기기는 추가 확인 대상으로 분류합니다.",
      enabled: Boolean(policy?.deviceRegistrationRequired)
    }
  ];
}

function summarizeUserAgent(userAgent: string) {
  const normalized = userAgent.toLowerCase();
  const browser = normalized.includes("edg/")
    ? "Edge"
    : normalized.includes("chrome/")
      ? "Chrome"
      : normalized.includes("safari/") && !normalized.includes("chrome/")
        ? "Safari"
        : normalized.includes("firefox/")
          ? "Firefox"
          : "브라우저 확인 필요";

  const os = normalized.includes("windows")
    ? "Windows"
    : normalized.includes("android")
      ? "Android"
      : normalized.includes("iphone") || normalized.includes("ipad") || normalized.includes("mac os")
        ? "Apple"
        : "OS 확인 필요";

  return `${browser} / ${os}`;
}

function maskFingerprint(value: string) {
  if (!value || value === "-") {
    return "-";
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function mapSessionStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "사용 중";
    case "TERMINATED":
      return "종료됨";
    case "EXPIRED":
      return "만료됨";
    case "BLOCKED":
      return "차단됨";
    default:
      return status;
  }
}

function mapDeviceStatusLabel(isTrusted: boolean, isBlocked: boolean) {
  if (isBlocked) return "차단됨";
  if (isTrusted) return "승인됨";
  return "승인 대기";
}

export async function login(payload: LoginPayload) {
  const response = await apiRequest<LoginApiResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: mapLoginResponseToCurrentUser(response, payload)
  };
}

export async function requestLoginOtp(payload: RequestLoginOtpPayload) {
  return apiRequest<{ sent: boolean; message: string; expiresInSeconds: number; cooldownSeconds: number }>("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchCurrentUser(accessToken: string): Promise<CurrentUser> {
  const response = await apiRequest<MeApiResponse>("/auth/me", { method: "GET" }, accessToken);
  return mapMeResponseToCurrentUser(response);
}

export async function logout(accessToken: string) {
  return apiRequest<{ success: boolean; sessionKey: string }>("/auth/logout", { method: "POST" }, accessToken);
}

export async function fetchPlaybackAccess(accessToken: string, stream = "main") {
  return apiRequest<PlaybackAccessResponse>(`/stream/playback-access?stream=${encodeURIComponent(stream)}`, { method: "GET" }, accessToken);
}

export async function fetchStreamStatus(stream = "main"): Promise<StreamStatus> {
  return apiRequest<StreamStatus>(`/stream/status?stream=${encodeURIComponent(stream)}`, { method: "GET" });
}

export async function fetchDashboardMetrics() {
  const [events, sessions, devices] = await Promise.all([fetchSecurityEvents(), fetchSessions(), fetchDevices()]);
  return {
    activeBranches: new Set(sessions.map((session) => session.branch)).size,
    activeSessions: sessions.filter((session) => session.status === "사용 중").length,
    highRiskEvents: events.filter((event) => event.severity === "high").length,
    trackedDevices: devices.length
  };
}

export async function fetchSecurityEvents() {
  const response = await apiRequest<Array<Record<string, unknown>>>("/security-events", { method: "GET" });
  return response.map((event, index) => {
    const type = typeof event.eventType === "string" ? event.eventType : "UNKNOWN";
    const detail = typeof event.detail === "object" && event.detail ? (event.detail as Record<string, unknown>) : {};
    const branchKey = typeof event.branchId === "string" ? event.branchId : "unknown";

    return {
      id: String(event.id ?? `security-event-${index}`),
      createdAt: formatDateTime(typeof event.createdAt === "string" ? event.createdAt : new Date().toISOString()),
      severity: typeof event.severity === "string" ? event.severity : "medium",
      severityLabel: mapSeverityLabel(typeof event.severity === "string" ? event.severity : "medium"),
      type,
      typeLabel: mapSecurityEventTypeLabel(type),
      branch: branchKey,
      branchLabel: mapBranchLabel(branchKey),
      detail: formatSecurityEventDetail(type, detail)
    };
  });
}

export async function fetchPolicies(branchCode: string) {
  const response = await apiRequest<BranchPolicyResponse>(`/security-policy/branches/${encodeURIComponent(branchCode)}`, { method: "GET" });
  return buildPolicyCards(response.policy);
}

export async function fetchBranches(): Promise<BranchSummary[]> {
  return apiRequest<BranchSummary[]>("/branches", { method: "GET" });
}

export async function fetchUserPolicy(userId: string) {
  const response = await apiRequest<UserPolicyResponse>(`/security-policy/users/${encodeURIComponent(userId)}`, { method: "GET" });
  return buildPolicyCards(response.policy);
}

export async function fetchUsers(): Promise<UserSummary[]> {
  const response = await apiRequest<Array<Record<string, unknown>>>("/users", { method: "GET" });
  return response.map((user, index) => {
    const branch = typeof user.branch === "object" && user.branch ? (user.branch as Record<string, unknown>) : {};
    const role = typeof user.role === "object" && user.role ? (user.role as Record<string, unknown>) : {};

    return {
      id: String(user.id ?? `user-${index}`),
      username: typeof user.username === "string" ? user.username : "unknown",
      branchCode: typeof branch.code === "string" ? branch.code : "unknown",
      branchName: typeof branch.name === "string" ? branch.name : mapBranchLabel(typeof branch.code === "string" ? branch.code : "unknown"),
      roleCode: typeof role.code === "string" ? role.code : "VIEWER",
      phone: typeof user.phone === "string" ? user.phone : "",
      password: typeof user.passwordHash === "string" ? user.passwordHash : "",
      isActive: Boolean(user.isActive)
    };
  });
}

export async function fetchSessions() {
  const response = await apiRequest<Array<Record<string, unknown>>>("/sessions", { method: "GET" });
  return response.map((session, index) => ({
    id: String(session.id ?? `session-${index}`),
    branchCode: typeof session.branchCode === "string" ? session.branchCode : "unknown",
    branch: mapBranchLabel(typeof session.branchCode === "string" ? session.branchCode : "unknown"),
    username: typeof session.username === "string" ? session.username : "unknown",
    deviceId: typeof session.deviceId === "string" ? session.deviceId : null,
    deviceLabel: typeof session.deviceLabel === "string" ? session.deviceLabel : "기기 확인 필요",
    ipAddress: typeof session.ipAddress === "string" ? session.ipAddress : "-",
    startedAt: formatDateTime(typeof session.startedAt === "string" ? session.startedAt : new Date().toISOString()),
    lastSeenAt: formatDateTime(typeof session.lastSeenAt === "string" ? session.lastSeenAt : new Date().toISOString()),
    sessionKey: typeof session.sessionKey === "string" ? session.sessionKey : "",
    sessionKeyTail: typeof session.sessionKey === "string" ? session.sessionKey.slice(-6) : "-",
    userAgentSummary: summarizeUserAgent(typeof session.userAgent === "string" ? session.userAgent : ""),
    status: mapSessionStatusLabel(typeof session.status === "string" ? session.status : "UNKNOWN")
  }));
}

export async function fetchDevices() {
  const response = await apiRequest<Array<Record<string, unknown>>>("/devices", { method: "GET" });
  return response.map((device, index) => {
    const isTrusted = Boolean(device.isTrusted);
    const isBlocked = Boolean(device.isBlocked);
    return {
      id: String(device.id ?? `device-${index}`),
      branchCode: typeof device.branchCode === "string" ? device.branchCode : "unknown",
      branch: typeof device.branchName === "string" ? device.branchName : mapBranchLabel(typeof device.branchCode === "string" ? device.branchCode : "unknown"),
      user: typeof device.username === "string" ? device.username : "-",
      label: typeof device.deviceLabel === "string" ? device.deviceLabel : "알 수 없는 기기",
      fingerprint: maskFingerprint(typeof device.fingerprintHash === "string" ? device.fingerprintHash : "-"),
      forensicLogoCode: typeof device.forensicLogoCode === "string" ? device.forensicLogoCode : "",
      forensicLogoProfile: typeof device.forensicLogoProfile === "object" && device.forensicLogoProfile ? (device.forensicLogoProfile as LogoVariantProfile) : undefined,
      forensicLogoAsset:
        typeof device.forensicLogoAsset === "object" && device.forensicLogoAsset
          ? (device.forensicLogoAsset as LogoVariantAsset)
          : undefined,
      trusted: isTrusted,
      blocked: isBlocked,
      statusLabel: mapDeviceStatusLabel(isTrusted, isBlocked),
      lastIp: typeof device.lastIp === "string" ? device.lastIp : "-",
      firstSeenAt: formatDateTime(typeof device.firstSeenAt === "string" ? device.firstSeenAt : new Date().toISOString()),
      lastSeenAt: formatDateTime(typeof device.lastSeenAt === "string" ? device.lastSeenAt : new Date().toISOString()),
      approvalUpdatedAt: typeof device.approvalUpdatedAt === "string" ? formatDateTime(device.approvalUpdatedAt) : "-",
      userAgentSummary: summarizeUserAgent(typeof device.lastUserAgent === "string" ? device.lastUserAgent : ""),
      displayName: typeof device.systemName === "string" ? device.systemName : "자동 감지 기기",
      currentSession: Boolean(device.isCurrentSession)
    };
  });
}

export async function approveDevice(deviceId: string) {
  return apiRequest(`/devices/${encodeURIComponent(deviceId)}/approve`, { method: "PATCH" });
}

export async function blockDevice(deviceId: string) {
  return apiRequest(`/devices/${encodeURIComponent(deviceId)}/block`, { method: "PATCH" });
}

export async function blockUser(userId: string) {
  return apiRequest(`/users/${encodeURIComponent(userId)}/block`, { method: "PATCH" });
}

export async function restoreUser(userId: string) {
  return apiRequest(`/users/${encodeURIComponent(userId)}/restore`, { method: "PATCH" });
}

export async function createUserAccount(payload: {
  branchCode: string;
  username: string;
  roleCode: "VIEWER";
  password: string;
  phone?: string;
}) {
  return apiRequest<{
    id: string;
    username: string;
    isActive: boolean;
  }>("/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function resetUserPassword(userId: string, password: string) {
  return apiRequest<{
    success: boolean;
    userId: string;
    username: string;
    temporaryPassword: string;
  }>(`/users/${encodeURIComponent(userId)}/reset-password`, {
    method: "PATCH",
    body: JSON.stringify({ password })
  });
}

export async function restoreDevice(deviceId: string) {
  return apiRequest(`/devices/${encodeURIComponent(deviceId)}/restore`, { method: "PATCH" });
}

export async function updateUserAccount(userId: string, payload: { roleCode?: "SUPER_ADMIN" | "VIEWER"; phone?: string }) {
  return apiRequest(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function updatePolicy(branchCode: string, field: PolicyCard["field"], enabled: boolean) {
  return apiRequest(`/security-policy/branches/${encodeURIComponent(branchCode)}`, {
    method: "PATCH",
    body: JSON.stringify({ [field]: enabled })
  });
}

export async function updateUserPolicy(userId: string, field: PolicyCard["field"], enabled: boolean) {
  return apiRequest(`/security-policy/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ [field]: enabled })
  });
}

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  const response = await apiRequest<AuditLogsApiResponse>("/audit-logs", { method: "GET" });
  const auditLogs = response.auditLogs ?? [];
  return auditLogs.map((log, index) => {
    const actionType = typeof log.actionType === "string" ? log.actionType : "UNKNOWN_ACTION";
    const payload = typeof log.payload === "object" && log.payload ? (log.payload as Record<string, unknown>) : {};
    const branchId = typeof log.branchId === "string" ? log.branchId : "-";

    return {
      id: String(log.id ?? `audit-log-${index}`),
      createdAt: formatDateTime(typeof log.createdAt === "string" ? log.createdAt : new Date().toISOString()),
      actionType,
      actionLabel: mapAuditActionLabel(actionType),
      actorIp: typeof log.actorIp === "string" ? log.actorIp : "-",
      branchId,
      branchLabel: mapBranchLabel(branchId),
      payloadSummary: formatAuditPayload(actionType, payload)
    };
  });
}

export async function fetchLoginAttemptLogs(): Promise<LoginAttemptLogItem[]> {
  const response = await apiRequest<AuditLogsApiResponse>("/audit-logs", { method: "GET" });
  const loginAttemptLogs = response.loginAttemptLogs ?? [];
  return loginAttemptLogs.map((log, index) => {
    const succeeded = Boolean(log.succeeded);
    const branchId = typeof log.branchId === "string" ? log.branchId : "-";
    const failureReason = typeof log.failureReason === "string" ? log.failureReason : "-";

    return {
      id: String(log.id ?? `login-attempt-${index}`),
      createdAt: formatDateTime(typeof log.createdAt === "string" ? log.createdAt : new Date().toISOString()),
      username: typeof log.username === "string" ? log.username : "unknown",
      attemptIp: typeof log.attemptIp === "string" ? log.attemptIp : "-",
      succeeded,
      resultLabel: succeeded ? "성공" : "실패",
      failureReason,
      failureReasonLabel: succeeded ? "-" : mapFailureReasonLabel(failureReason),
      branchId,
      branchLabel: mapBranchLabel(branchId)
    };
  });
}

export async function fetchLeakageCandidates(query: LeakageCandidateQuery): Promise<LeakageCandidateSearchResult> {
  const params = new URLSearchParams();

  if (query.sessionCodeFragment) params.set("sessionCodeFragment", query.sessionCodeFragment);
  if (query.branchCode) params.set("branchCode", query.branchCode);
  if (query.deviceId) params.set("deviceId", query.deviceId);
  if (query.username) params.set("username", query.username);
  if (query.auditActionType) params.set("auditActionType", query.auditActionType);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiRequest<{
    summary: LeakageCandidateSearchResult["summary"];
    candidates: Array<Record<string, unknown>>;
  }>(`/watermarks/leakage-candidates${suffix}`, { method: "GET" });

  return {
    summary: response.summary,
    candidates: response.candidates.map((candidate, index) => {
      const auditLogs = Array.isArray(candidate.recentAuditLogs) ? candidate.recentAuditLogs : [];
      const securityEvents = Array.isArray(candidate.recentSecurityEvents) ? candidate.recentSecurityEvents : [];
      const visibleWatermark = typeof candidate.watermark === "object" && candidate.watermark ? (candidate.watermark as Record<string, unknown>).visibleWatermark as Record<string, unknown> | undefined : undefined;
      const status = typeof candidate.status === "string" ? candidate.status : "UNKNOWN";

      return {
        id: String(candidate.id ?? `candidate-${index}`),
        userId: typeof candidate.userId === "string" ? candidate.userId : "",
        deviceId: typeof candidate.deviceId === "string" ? candidate.deviceId : null,
        deviceLabel: typeof candidate.deviceLabel === "string" ? candidate.deviceLabel : null,
        branchCode: typeof candidate.branchCode === "string" ? candidate.branchCode : "unknown",
        branchName: typeof candidate.branchName === "string" ? candidate.branchName : mapBranchLabel(typeof candidate.branchCode === "string" ? candidate.branchCode : "unknown"),
        username: typeof candidate.username === "string" ? candidate.username : "unknown",
        sessionKey: typeof candidate.sessionKey === "string" ? candidate.sessionKey : "-",
        sessionCodeTail: typeof candidate.sessionCodeTail === "string" ? candidate.sessionCodeTail : "-",
        startedAt: formatDateTime(typeof candidate.startedAt === "string" ? candidate.startedAt : new Date().toISOString()),
        status,
        statusLabel: mapSessionStatusLabel(status),
        ipAddress: typeof candidate.ipAddress === "string" ? candidate.ipAddress : "-",
        matchedBy: Array.isArray(candidate.matchedBy) ? candidate.matchedBy.filter((value): value is string => typeof value === "string") : [],
        watermarkSummary: visibleWatermark
          ? `세션 코드 ${String(visibleWatermark.sessionCode ?? "-")} / 식별 토큰 ${String(visibleWatermark.logoFingerprintCode ?? "-")} / 표시 색상 ${String(visibleWatermark.tint ?? "-")}`
          : "세션 워터마크 정보 없음",
        confidenceScore: typeof candidate.confidenceScore === "number" ? candidate.confidenceScore : 0,
        recentAuditLogs: auditLogs.map((log, logIndex) => {
          const actionType = typeof (log as Record<string, unknown>).actionType === "string" ? String((log as Record<string, unknown>).actionType) : `LOG-${logIndex}`;
          const payload = typeof (log as Record<string, unknown>).payload === "object" && (log as Record<string, unknown>).payload ? (log as Record<string, unknown>).payload as Record<string, unknown> : {};
          return {
            createdAt: formatDateTime(typeof (log as Record<string, unknown>).createdAt === "string" ? String((log as Record<string, unknown>).createdAt) : new Date().toISOString()),
            actionLabel: mapAuditActionLabel(actionType),
            summary: formatAuditPayload(actionType, payload)
          };
        }),
        recentSecurityEvents: securityEvents.map((event, eventIndex) => {
          const eventType = typeof (event as Record<string, unknown>).eventType === "string" ? String((event as Record<string, unknown>).eventType) : `EVENT-${eventIndex}`;
          const detail = typeof (event as Record<string, unknown>).detail === "object" && (event as Record<string, unknown>).detail ? (event as Record<string, unknown>).detail as Record<string, unknown> : {};
          const severity = typeof (event as Record<string, unknown>).severity === "string" ? String((event as Record<string, unknown>).severity) : "medium";
          return {
            createdAt: formatDateTime(typeof (event as Record<string, unknown>).createdAt === "string" ? String((event as Record<string, unknown>).createdAt) : new Date().toISOString()),
            severity: mapSeverityLabel(severity),
            typeLabel: mapSecurityEventTypeLabel(eventType),
            detail: formatSecurityEventDetail(eventType, detail)
          };
        })
      };
    })
  };
}

export async function reportClientSecurityEvent(payload: {
  branchId?: string;
  userId?: string;
  eventType: string;
  severity: "low" | "medium" | "high";
  detail: Record<string, unknown>;
}) {
  return apiRequest("/security-events", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}




