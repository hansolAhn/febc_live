export type LeakageSearchFormState = {
  sessionCodeFragment: string;
  branchCode: string;
  username: string;
  auditActionType: string;
};

export const leakageActionOptions = [
  { value: "", label: "전체 행동" },
  { value: "LOGIN_SUCCESS", label: "로그인" },
  { value: "LOGOUT", label: "로그아웃" },
  { value: "SECURITY_POLICY_UPDATED", label: "정책 변경" },
  { value: "OTP_SENT", label: "OTP 발송" },
  { value: "DEVICE_APPROVED", label: "기기 승인" },
  { value: "DEVICE_BLOCKED", label: "기기 차단" },
  { value: "USER_BLOCKED", label: "사용자 차단" },
  { value: "USER_RESTORED", label: "차단 해제" }
] as const;

export function createInitialLeakageSearchFormState(): LeakageSearchFormState {
  return {
    sessionCodeFragment: "",
    branchCode: "",
    username: "",
    auditActionType: ""
  };
}

type BranchLike = {
  branchCode: string;
  branchName: string;
};

type SessionLike = {
  branchCode: string;
  username: string;
};

export function buildBranchOptions(users: BranchLike[]) {
  const seen = new Map<string, string>();
  for (const user of users) {
    if (!seen.has(user.branchCode)) {
      seen.set(user.branchCode, user.branchName);
    }
  }
  return [...seen.entries()].map(([code, name]) => ({ code, name }));
}

export function filterUsersByBranch<T extends BranchLike>(users: T[], branchCode: string): T[] {
  if (!branchCode) {
    return users;
  }
  return users.filter((user) => user.branchCode === branchCode);
}

export function filterSessionsByBranchAndUser<T extends SessionLike>(sessions: T[], branchCode: string, username: string): T[] {
  let nextSessions = sessions;
  if (branchCode) {
    nextSessions = nextSessions.filter((session) => session.branchCode === branchCode);
  }
  if (username) {
    nextSessions = nextSessions.filter((session) => session.username === username);
  }
  return nextSessions;
}

type LeakageQueryInput = {
  sessionCodeFragment: string;
  branchCode: string;
  username: string;
  auditActionType: string;
  deviceId: string;
};

export function buildLeakageCandidateQuery(input: LeakageQueryInput) {
  return {
    sessionCodeFragment: input.sessionCodeFragment.trim() || undefined,
    branchCode: input.branchCode.trim() || undefined,
    deviceId: input.deviceId || undefined,
    username: input.username.trim() || undefined,
    auditActionType: input.auditActionType || undefined
  };
}
