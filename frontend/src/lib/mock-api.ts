export type WatermarkPayload = {
  profileId: string;
  profileVersion: number;
  visibleWatermark: {
    logoVariant: string;
    microShift: string;
    tint: string;
    sessionCode: string;
  };
  hiddenForensicWatermark: {
    strategy: string;
    profileVersion: number;
    hiddenConfig: Record<string, unknown>;
  };
};

export type LoginPayload = {
  branchCode: string;
  username: string;
  password: string;
  otpCode?: string;
  deviceFingerprint: string;
  deviceLabel: string;
  forceLogin?: boolean;
};

export type RequestLoginOtpPayload = {
  branchCode: string;
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
    forensicWatermarkEnabled?: boolean;
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
    forensicWatermarkEnabled?: boolean;
  };
  allowedIps?: Array<{ cidr: string }>;
};

type PolicyCard = {
  id: string;
  field: "singleSessionOnly" | "otpRequired" | "deviceRegistrationRequired" | "forensicWatermarkEnabled";
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
  isActive: boolean;
};

type LogoProfile = {
  id: string;
  branchCode: string;
  profileVersion: number;
  profileName: string;
  visibleWatermarkConfig: Record<string, unknown>;
  hiddenWatermarkConfig: Record<string, unknown>;
  isActive: boolean;
};

type LogoAssignment = {
  id: string;
  eventCode: string;
  branchCode: string;
  sessionCode: string;
  profileId: string;
};

type AuditLogsApiResponse = {
  auditLogs?: Array<Record<string, unknown>>;
  loginAttemptLogs?: Array<Record<string, unknown>>;
};

type AuditLogItem = {
  id: string;
  createdAt: string;
  actionType: string;
  actionLabel: string;
  actorIp: string;
  branchId: string;
  branchLabel: string;
  payloadSummary: string;
};

type LoginAttemptLogItem = {
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
  username?: string;
  observedAt?: string;
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
      username: string | null;
      observedAtFrom: string | null;
      observedAtTo: string | null;
    };
  };
  candidates: LeakageCandidate[];
};

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

function mapPolicyFieldLabel(field: string) {
  switch (field) {
    case "singleSessionOnly":
      return "지사당 1세션 제한";
    case "otpRequired":
      return "문자 OTP 필수";
    case "deviceRegistrationRequired":
      return "등록 기기만 허용";
    case "forensicWatermarkEnabled":
      return "포렌식 워터마크";
    default:
      return field;
  }
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
    },
    {
      id: "forensic-watermark",
      field: "forensicWatermarkEnabled",
      title: "포렌식 워터마크",
      description: "시청자 정보와 지사별 식별값을 화면에 표시합니다.",
      enabled: Boolean(policy?.forensicWatermarkEnabled)
    }
  ];
}

function mapAuditActionLabel(actionType: string) {
  switch (actionType) {
    case "LOGIN_SUCCESS":
      return "로그인 성공";
    case "LOGIN_ATTEMPT":
      return "세션 발급";
    case "LOGIN_FAILURE":
      return "로그인 실패";
    case "LOGOUT":
      return "로그아웃";
    case "SECURITY_POLICY_UPDATED":
      return "보안 정책 변경";
    case "OTP_SENT":
      return "OTP 발송";
    case "DEVICE_APPROVED":
      return "기기 승인";
    case "DEVICE_BLOCKED":
      return "기기 차단";
    case "USER_BLOCKED":
      return "계정 차단";
    case "USER_RESTORED":
      return "계정 차단 해제";
    default:
      return actionType;
  }
}

function mapFailureReasonLabel(reason: string) {
  switch (reason) {
    case "INVALID_CREDENTIALS":
      return "아이디 또는 비밀번호 불일치";
    case "DISALLOWED_IP":
      return "허용되지 않은 IP";
    case "OTP_REQUIRED_OR_INVALID":
      return "OTP 인증 실패";
    case "BRANCH_NOT_FOUND":
      return "지사 정보를 찾을 수 없음";
    case "DEVICE_NOT_REGISTERED":
      return "관리자 승인 대기 기기";
    case "DEVICE_BLOCKED":
      return "차단된 기기";
    case "ACCOUNT_BLOCKED":
      return "차단된 계정";
    default:
      return reason || "-";
  }
}

function mapSecurityEventTypeLabel(type: string) {
  switch (type) {
    case "LOGIN_FAILURE":
      return "로그인 실패";
    case "DISALLOWED_IP":
      return "허용되지 않은 IP 접속";
    case "OTP_FAILURE":
      return "OTP 인증 실패";
    case "DEVICE_NOT_REGISTERED":
      return "승인되지 않은 기기 로그인 시도";
    case "SESSION_TAKEOVER":
      return "기존 세션 종료 후 로그인";
    case "CONCURRENT_SESSION_BLOCKED":
      return "중복 로그인 차단";
    case "BLOCKED_DEVICE_LOGIN":
      return "차단된 기기 로그인 시도";
    default:
      return type;
  }
}

function mapSeverityLabel(severity: string) {
  switch (severity) {
    case "high":
      return "고위험";
    case "medium":
      return "보통";
    case "low":
      return "참고";
    default:
      return severity;
  }
}

function formatSecurityEventDetail(type: string, detail: Record<string, unknown>) {
  switch (type) {
    case "LOGIN_FAILURE":
      return `로그인에 실패했습니다. 아이디: ${String(detail.username ?? "-")}`;
    case "DISALLOWED_IP":
      return `허용되지 않은 IP에서 접속을 시도했습니다. IP: ${String(detail.ipAddress ?? "-")}`;
    case "OTP_FAILURE":
      return `OTP 인증에 실패했습니다. 아이디: ${String(detail.username ?? "-")}`;
    case "DEVICE_NOT_REGISTERED":
      return `관리자 승인이 필요한 기기입니다. 기기명: ${String(detail.deviceLabel ?? "-")}`;
    case "SESSION_TAKEOVER":
      if (detail.takeoverMode === "MASTER_OVERRIDE") {
        return `최고 관리자가 기존 세션을 종료하고 로그인했습니다. 아이디: ${String(detail.username ?? "-")}`;
      }

      return `기존 세션 종료 후 로그인을 선택했습니다. 아이디: ${String(detail.username ?? "-")}`;
    case "CONCURRENT_SESSION_BLOCKED":
      return `이미 로그인 중이어서 새 로그인을 차단했습니다. 아이디: ${String(detail.username ?? "-")}`;
    case "BLOCKED_DEVICE_LOGIN":
      return `차단된 기기에서 로그인을 시도했습니다. 기기명: ${String(detail.deviceLabel ?? "-")}`;
    default:
      return JSON.stringify(detail);
  }
}

function formatAuditPayload(actionType: string, payload: Record<string, unknown>) {
  switch (actionType) {
    case "LOGIN_SUCCESS":
      return `사용자 ${String(payload.username ?? "-")} 로그인 성공`;
    case "LOGIN_ATTEMPT":
      return "로그인 세션이 발급되어 브라우저 정보가 함께 기록되었습니다.";
    case "LOGOUT":
      return "사용자가 로그아웃했습니다.";
    case "SECURITY_POLICY_UPDATED": {
      const changes = payload.changes as Record<string, unknown> | undefined;
      if (!changes) return "보안 정책이 변경되었습니다.";
      const entries = Object.entries(changes).map(([key, value]) => `${mapPolicyFieldLabel(key)}: ${value ? "켜짐" : "꺼짐"}`);
      return `정책 변경 - ${entries.join(", ")}`;
    }
    case "OTP_SENT":
      return `사용자 ${String(payload.username ?? "-")}에게 로그인용 OTP를 발송했습니다.`;
    case "DEVICE_APPROVED":
      return `기기 ${String(payload.deviceLabel ?? "-")}를 승인했습니다.`;
    case "DEVICE_BLOCKED":
      return `기기 ${String(payload.deviceLabel ?? "-")}를 차단했습니다.`;
    case "USER_BLOCKED":
      return `사용자 ${String(payload.username ?? "-")} 계정을 차단했습니다.`;
    case "USER_RESTORED":
      return `사용자 ${String(payload.username ?? "-")} 계정 차단을 해제했습니다.`;
    default:
      return JSON.stringify(payload);
  }
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
      isActive: Boolean(user.isActive)
    };
  });
}

export async function fetchSessions() {
  const response = await apiRequest<Array<Record<string, unknown>>>("/sessions", { method: "GET" });
  return response.map((session, index) => ({
    id: String(session.id ?? `session-${index}`),
    branch: mapBranchLabel(typeof session.branchCode === "string" ? session.branchCode : "unknown"),
    username: typeof session.username === "string" ? session.username : "unknown",
    ipAddress: typeof session.ipAddress === "string" ? session.ipAddress : "-",
    startedAt: formatDateTime(typeof session.startedAt === "string" ? session.startedAt : new Date().toISOString()),
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
      branch: typeof device.branchName === "string" ? device.branchName : mapBranchLabel(typeof device.branchCode === "string" ? device.branchCode : "unknown"),
      user: typeof device.username === "string" ? device.username : "-",
      label: typeof device.deviceLabel === "string" ? device.deviceLabel : "알 수 없는 기기",
      fingerprint: typeof device.fingerprintHash === "string" ? device.fingerprintHash : "-",
      trusted: isTrusted,
      blocked: isBlocked,
      statusLabel: mapDeviceStatusLabel(isTrusted, isBlocked),
      lastIp: typeof device.lastIp === "string" ? device.lastIp : "-"
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

export async function fetchLogoProfiles(branchCode?: string): Promise<LogoProfile[]> {
  const query = branchCode ? `?branchCode=${encodeURIComponent(branchCode)}` : "";
  return apiRequest<LogoProfile[]>(`/watermarks/profiles${query}`, { method: "GET" });
}

export async function fetchLogoAssignments(): Promise<LogoAssignment[]> {
  return apiRequest<LogoAssignment[]>("/watermarks/assignments", { method: "GET" });
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
  if (query.username) params.set("username", query.username);

  if (query.observedAt) {
    const center = new Date(query.observedAt);
    if (!Number.isNaN(center.getTime())) {
      params.set("observedAtFrom", new Date(center.getTime() - 10 * 60 * 1000).toISOString());
      params.set("observedAtTo", new Date(center.getTime() + 10 * 60 * 1000).toISOString());
    }
  }

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
          ? `로고 ${String(visibleWatermark.logoVariant ?? "-")} / 세션 코드 ${String(visibleWatermark.sessionCode ?? "-")}`
          : "워터마크 정보 없음",
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

