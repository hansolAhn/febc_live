function describeRecord(entries: Array<[string, unknown]>) {
  return entries
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

export function mapPolicyFieldLabel(field: string) {
  switch (field) {
    case "singleSessionOnly":
      return "지사당 1세션 제한";
    case "otpRequired":
      return "문자 OTP 필수";
    case "deviceRegistrationRequired":
      return "등록 기기만 허용";
    default:
      return field;
  }
}

export function mapAuditActionLabel(actionType: string) {
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
    case "DEVICE_RESTORED":
      return "기기 차단 해제";
    case "USER_CREATED":
      return "계정 생성";
    case "USER_BLOCKED":
      return "계정 차단";
    case "USER_RESTORED":
      return "계정 차단 해제";
    case "USER_PASSWORD_RESET":
      return "비밀번호 초기화";
    case "USER_UPDATED":
      return "계정 정보 수정";
    default:
      return actionType;
  }
}

export function mapFailureReasonLabel(reason: string) {
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

export function mapSecurityEventTypeLabel(type: string) {
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
    case "PLAYER_BACKGROUND_BLOCKED":
      return "백그라운드 재생 차단";
    case "PLAYER_DEVTOOLS_BLOCKED":
      return "개발자도구 의심 환경 차단";
    case "PLAYER_PIP_BLOCKED":
      return "PIP 재생 차단";
    case "PLAYER_REMOTE_PLAYBACK_BLOCKED":
      return "원격 재생 차단";
    default:
      return type;
  }
}

export function mapSeverityLabel(severity: string) {
  switch (severity) {
    case "high":
      return "높음";
    case "medium":
      return "보통";
    case "low":
      return "낮음";
    default:
      return severity;
  }
}

export function formatSecurityEventDetail(type: string, detail: Record<string, unknown>) {
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
        return detail.hasDifferentNetwork
          ? `최고 관리자가 다른 네트워크에서 기존 세션을 종료하고 로그인했습니다. 아이디: ${String(detail.username ?? "-")}`
          : `최고 관리자가 같은 네트워크에서 기존 세션을 종료하고 로그인했습니다. 아이디: ${String(detail.username ?? "-")}`;
      }

      return detail.hasDifferentNetwork
        ? `기존 세션을 종료하고 다른 네트워크에서 다시 로그인했습니다. 아이디: ${String(detail.username ?? "-")}`
        : `기존 세션을 종료하고 같은 네트워크에서 다시 로그인했습니다. 아이디: ${String(detail.username ?? "-")}`;
    case "CONCURRENT_SESSION_BLOCKED":
      return `이미 로그인 중이어서 새 로그인을 차단했습니다. 아이디: ${String(detail.username ?? "-")}`;
    case "BLOCKED_DEVICE_LOGIN":
      return `차단된 기기에서 로그인을 시도했습니다. 기기명: ${String(detail.deviceLabel ?? "-")}`;
    default:
      return JSON.stringify(detail);
  }
}

export function formatAuditPayload(actionType: string, payload: Record<string, unknown>) {
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
      return `기기 승인 - ${describeRecord([["기기 이름", payload.deviceLabel], ["기기 ID", payload.deviceId], ["소속", payload.branchName], ["아이디", payload.username]])}`;
    case "DEVICE_BLOCKED":
      return `기기 차단 - ${describeRecord([["기기 이름", payload.deviceLabel], ["기기 ID", payload.deviceId], ["소속", payload.branchName], ["아이디", payload.username]])}`;
    case "DEVICE_RESTORED":
      return `기기 차단 해제 - ${describeRecord([["기기 이름", payload.deviceLabel], ["기기 ID", payload.deviceId], ["소속", payload.branchName], ["아이디", payload.username]])}`;
    case "USER_CREATED":
      return `계정 생성 - ${describeRecord([["소속", payload.branchName], ["아이디", payload.username], ["권한", payload.roleCode], ["연락처", payload.phone]])}`;
    case "USER_BLOCKED":
      return `계정 차단 - ${describeRecord([["소속", payload.branchName], ["아이디", payload.username]])}`;
    case "USER_RESTORED":
      return `계정 차단 해제 - ${describeRecord([["소속", payload.branchName], ["아이디", payload.username]])}`;
    case "USER_PASSWORD_RESET":
      return `비밀번호 초기화 - ${describeRecord([["소속", payload.branchName], ["아이디", payload.username], ["임시 비밀번호", payload.temporaryPassword]])}`;
    case "USER_UPDATED":
      return `계정 정보 수정 - ${describeRecord([["소속", payload.branchName], ["아이디", payload.username], ["권한", payload.roleCode], ["연락처", payload.phone]])}`;
    default:
      return describeRecord(
        Object.entries(payload).map(([key, value]) => {
          const translatedKey =
            key === "deviceId"
              ? "기기 ID"
              : key === "deviceLabel"
                ? "기기 이름"
                : key === "branchName"
                  ? "소속"
                  : key === "username"
                    ? "아이디"
                    : key === "ipAddress"
                      ? "IP 주소"
                      : key === "phone"
                        ? "연락처"
                        : key === "temporaryPassword"
                          ? "임시 비밀번호"
                          : key === "roleCode"
                            ? "권한"
                            : key === "takeoverMode"
                              ? "세션 전환 방식"
                              : key === "hasDifferentNetwork"
                                ? "다른 네트워크 사용 여부"
                                : key;
          return [translatedKey, value];
        })
      );
  }
}
