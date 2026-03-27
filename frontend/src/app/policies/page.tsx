"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PolicyToggleCard } from "@/components/PolicyToggleCard";
import { useAuth } from "@/components/providers/AuthProvider";
import * as mockApi from "@/lib/mock-api";

type Policy = Awaited<ReturnType<typeof mockApi.fetchPolicies>>[number];
type LogoProfile = Awaited<ReturnType<typeof mockApi.fetchLogoProfiles>>[number];
type LogoAssignment = Awaited<ReturnType<typeof mockApi.fetchLogoAssignments>>[number];
type AuditLog = Awaited<ReturnType<typeof mockApi.fetchAuditLogs>>[number];
type UserSummary = Awaited<ReturnType<typeof mockApi.fetchUsers>>[number];
type SearchFormState = {
  sessionCodeFragment: string;
  branchCode: string;
  username: string;
  observedAt: string;
};
type SortMode = "confidence" | "latest" | "oldest";

const initialLeakageFormState: SearchFormState = {
  sessionCodeFragment: "",
  branchCode: "",
  username: "",
  observedAt: ""
};

export default function PoliciesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const branchCode = user?.branchCode ?? null;

  const [branchPolicies, setBranchPolicies] = useState<Policy[]>([]);
  const [userPolicies, setUserPolicies] = useState<Policy[]>([]);
  const [profiles, setProfiles] = useState<LogoProfile[]>([]);
  const [assignments, setAssignments] = useState<LogoAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUserPolicyLoading, setIsUserPolicyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"policy" | "watermark" | "history" | "leakage">("policy");
  const [leakageForm, setLeakageForm] = useState<SearchFormState>(initialLeakageFormState);
  const [sortMode, setSortMode] = useState<SortMode>("confidence");
  const [isLeakageLoading, setIsLeakageLoading] = useState(false);
  const [leakageResult, setLeakageResult] = useState<mockApi.LeakageCandidateSearchResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const selectedUser = useMemo(() => users.find((item) => item.id === selectedUserId) ?? null, [selectedUserId, users]);
  const hasLeakageQuery = useMemo(() => Object.values(leakageForm).some((value) => value.trim().length > 0), [leakageForm]);
  const sortedCandidates = useMemo(() => {
    if (!leakageResult) return [];
    const nextCandidates = [...leakageResult.candidates];
    nextCandidates.sort((left, right) => {
      if (sortMode === "latest") return right.startedAt.localeCompare(left.startedAt);
      if (sortMode === "oldest") return left.startedAt.localeCompare(right.startedAt);
      return right.confidenceScore - left.confidenceScore || right.startedAt.localeCompare(left.startedAt);
    });
    return nextCandidates;
  }, [leakageResult, sortMode]);

  async function loadBranchPolicyData(targetBranchCode: string) {
    const [policyData, profileData, assignmentData, auditLogData, userData] = await Promise.all([
      mockApi.fetchPolicies(targetBranchCode),
      mockApi.fetchLogoProfiles(targetBranchCode),
      mockApi.fetchLogoAssignments(),
      mockApi.fetchAuditLogs(),
      mockApi.fetchUsers()
    ]);

    const branchUsers = userData.filter((item) => item.branchCode === targetBranchCode);

    return {
      policyData,
      profileData,
      assignmentData: assignmentData.filter((assignment) => assignment.branchCode === targetBranchCode),
      auditLogData: auditLogData.filter((log) => log.actionType.includes("SECURITY_POLICY")).slice(0, 10),
      branchUsers
    };
  }

  async function loadUserPolicyData(targetUserId: string) {
    return mockApi.fetchUserPolicy(targetUserId);
  }

  useEffect(() => {
    if (isAuthLoading) return;
    if (!branchCode) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    async function load() {
      const targetBranchCode = branchCode as string;
      setIsLoading(true);
      setError(null);
      try {
        const { policyData, profileData, assignmentData, auditLogData, branchUsers } = await loadBranchPolicyData(targetBranchCode);
        if (cancelled) return;
        setBranchPolicies(policyData);
        setProfiles(profileData);
        setAssignments(assignmentData);
        setAuditLogs(auditLogData);
        setUsers(branchUsers);
        setSelectedUserId(branchUsers[0]?.id ?? "");
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "정책 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [branchCode, isAuthLoading, router]);

  useEffect(() => {
    if (!selectedUserId) {
      setUserPolicies([]);
      return;
    }

    let cancelled = false;
    async function loadUserPolicies() {
      setIsUserPolicyLoading(true);
      setError(null);
      try {
        const nextPolicies = await loadUserPolicyData(selectedUserId);
        if (!cancelled) setUserPolicies(nextPolicies);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "사용자별 정책을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setIsUserPolicyLoading(false);
      }
    }

    void loadUserPolicies();
    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  async function toggleBranchPolicy(policy: Policy) {
    if (!branchCode) return;
    const nextEnabled = !policy.enabled;
    setError(null);
    setBranchPolicies((current) => current.map((item) => (item.id === policy.id ? { ...item, enabled: nextEnabled } : item)));
    try {
      await mockApi.updatePolicy(branchCode, policy.field, nextEnabled);
      const { policyData, auditLogData } = await loadBranchPolicyData(branchCode);
      setBranchPolicies(policyData);
      setAuditLogs(auditLogData);
    } catch (updateError) {
      setBranchPolicies((current) => current.map((item) => (item.id === policy.id ? { ...item, enabled: policy.enabled } : item)));
      setError(updateError instanceof Error ? updateError.message : "지사 정책 변경에 실패했습니다.");
    }
  }

  async function toggleUserPolicy(policy: Policy) {
    if (!selectedUserId) return;
    const nextEnabled = !policy.enabled;
    setError(null);
    setUserPolicies((current) => current.map((item) => (item.id === policy.id ? { ...item, enabled: nextEnabled } : item)));
    try {
      await mockApi.updateUserPolicy(selectedUserId, policy.field, nextEnabled);
      const [nextUserPolicies, nextAuditLogs] = await Promise.all([loadUserPolicyData(selectedUserId), mockApi.fetchAuditLogs()]);
      setUserPolicies(nextUserPolicies);
      setAuditLogs(nextAuditLogs.filter((log) => log.actionType.includes("SECURITY_POLICY")).slice(0, 10));
    } catch (updateError) {
      setUserPolicies((current) => current.map((item) => (item.id === policy.id ? { ...item, enabled: policy.enabled } : item)));
      setError(updateError instanceof Error ? updateError.message : "사용자별 정책 변경에 실패했습니다.");
    }
  }

  async function handleLeakageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLeakageLoading(true);
    setError(null);
    setActionMessage("");
    try {
      const nextResult = await mockApi.fetchLeakageCandidates({
        sessionCodeFragment: leakageForm.sessionCodeFragment.trim() || undefined,
        branchCode: leakageForm.branchCode.trim() || undefined,
        username: leakageForm.username.trim() || undefined,
        observedAt: leakageForm.observedAt || undefined
      });
      setLeakageResult(nextResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "유출 후보 분석을 불러오지 못했습니다.");
    } finally {
      setIsLeakageLoading(false);
    }
  }

  function resetLeakageForm() {
    setLeakageForm(initialLeakageFormState);
    setLeakageResult(null);
    setSelectedFileName("");
    setActionMessage("");
    setError(null);
  }

  async function handleBlockUser(candidate: mockApi.LeakageCandidate) {
    setBusyKey(`user-${candidate.userId}`);
    setActionMessage("");
    try {
      await mockApi.blockUser(candidate.userId);
      setActionMessage(`${candidate.username} 계정을 차단했습니다.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "계정 차단에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  }

  async function handleBlockDevice(candidate: mockApi.LeakageCandidate) {
    if (!candidate.deviceId) {
      setError("이 세션과 연결된 기기 정보를 찾지 못했습니다.");
      return;
    }
    setBusyKey(`device-${candidate.deviceId}`);
    setActionMessage("");
    try {
      await mockApi.blockDevice(candidate.deviceId);
      setActionMessage(`${candidate.deviceLabel ?? "해당 기기"}를 차단했습니다.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "기기 차단에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  }

  if (isAuthLoading) {
    return <div className="login-shell"><div className="panel">로그인 상태를 확인하는 중입니다...</div></div>;
  }
  if (!branchCode) {
    return <div className="login-shell"><div className="panel">로그인 화면으로 이동하는 중입니다...</div></div>;
  }

  return (
    <div className="page-wrap">
      <PageHeader title="지사별 정책 관리" subtitle="정책, 워터마크, 변경 이력, 유출 분석을 한 화면에서 관리합니다." />

      {error ? <div className="panel">{error}</div> : null}
      {isLoading ? <div className="panel">정책 데이터를 불러오는 중입니다...</div> : null}

      {!isLoading ? (
        <>
          <div className="tab-bar">
            <button className={activeTab === "policy" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("policy")} type="button">기본 정책 / 사용자 예외</button>
            <button className={activeTab === "watermark" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("watermark")} type="button">워터마크</button>
            <button className={activeTab === "history" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("history")} type="button">변경 이력</button>
            <button className={activeTab === "leakage" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("leakage")} type="button">유출 분석</button>
          </div>

          {activeTab === "policy" ? (
            <>
              <div className="panel stack">
                <div className="panel-title">지사 기본 정책</div>
                <div className="grid two">
                  {branchPolicies.map((policy) => (
                    <PolicyToggleCard key={policy.id} title={policy.title} description={policy.description} enabled={policy.enabled} onToggle={() => void toggleBranchPolicy(policy)} />
                  ))}
                </div>
              </div>

              <div className="panel stack">
                <div className="panel-header-inline">
                  <div>
                    <div className="panel-title">사용자별 예외 정책</div>
                    <div className="muted">지사 기본 정책과 다르게 설정해야 하는 특정 계정만 별도로 조정합니다.</div>
                  </div>
                  <div style={{ minWidth: 260 }}>
                    <label className="label" htmlFor="policy-user-select">사용자 선택</label>
                    <select id="policy-user-select" className="input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                      {users.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.username} / {item.roleCode === "SUPER_ADMIN" ? "최고 관리자" : item.roleCode === "BRANCH_ADMIN" ? "지사 관리자" : "시청자"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedUser ? <div className="muted">선택 계정: {selectedUser.username} / 상태: {selectedUser.isActive ? "사용 가능" : "차단됨"}</div> : <div className="muted">지사에 등록된 사용자가 없습니다.</div>}

                {selectedUser && !isUserPolicyLoading ? (
                  <div className="grid two">
                    {userPolicies.map((policy) => (
                      <PolicyToggleCard key={`user-${selectedUser.id}-${policy.id}`} title={policy.title} description="" enabled={policy.enabled} onToggle={() => void toggleUserPolicy(policy)} />
                    ))}
                  </div>
                ) : null}

                {selectedUser && isUserPolicyLoading ? <div className="muted">사용자별 예외 정책을 불러오는 중입니다...</div> : null}
              </div>
            </>
          ) : null}

          {activeTab === "watermark" ? (
            <>
              <div className="panel">
                <div className="panel-title">지사 로고 프로필</div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>지사 코드</th><th>프로필명</th><th>버전</th><th>보이는 워터마크</th><th>숨은 워터마크</th><th>상태</th></tr></thead>
                    <tbody>
                      {profiles.map((profile) => (
                        <tr key={profile.id}>
                          <td>{profile.branchCode}</td>
                          <td>{profile.profileName}</td>
                          <td>v{profile.profileVersion}</td>
                          <td>{String(profile.visibleWatermarkConfig.logoVariant ?? "기본형")} / shift {String(profile.visibleWatermarkConfig.microShift ?? "0px")}</td>
                          <td>{String(profile.hiddenWatermarkConfig.embeddingMode ?? "metadata-placeholder")}</td>
                          <td>{profile.isActive ? "사용 중" : "중지"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">이벤트별 로고 배정</div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>이벤트 코드</th><th>지사 코드</th><th>세션 코드</th><th>프로필 ID</th></tr></thead>
                    <tbody>
                      {assignments.map((assignment) => (
                        <tr key={assignment.id}><td>{assignment.eventCode}</td><td>{assignment.branchCode}</td><td>{assignment.sessionCode}</td><td>{assignment.profileId}</td></tr>
                      ))}
                      {assignments.length === 0 ? <tr><td colSpan={4}>현재 지사에 배정된 이벤트 로고가 없습니다.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "history" ? (
            <div className="panel">
              <div className="panel-title">최근 정책 변경 감사 로그</div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>시각</th><th>이벤트</th><th>지사</th><th>IP</th><th>변경 내용</th></tr></thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}><td>{log.createdAt}</td><td>{log.actionLabel}</td><td>{log.branchLabel}</td><td>{log.actorIp}</td><td>{log.payloadSummary}</td></tr>
                    ))}
                    {auditLogs.length === 0 ? <tr><td colSpan={5}>아직 기록된 정책 변경 감사 로그가 없습니다.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === "leakage" ? (
            <>
              <form className="panel stack" onSubmit={handleLeakageSubmit}>
                <div className="grid two">
                  <div><label className="label" htmlFor="session-code-fragment">세션 코드 조각</label><input id="session-code-fragment" className="input" placeholder="예: b016f 또는 끝 6~8자리" value={leakageForm.sessionCodeFragment} onChange={(event) => setLeakageForm((current) => ({ ...current, sessionCodeFragment: event.target.value }))} /></div>
                  <div><label className="label" htmlFor="branch-code">지사 코드</label><input id="branch-code" className="input" placeholder="예: seoul-hq" value={leakageForm.branchCode} onChange={(event) => setLeakageForm((current) => ({ ...current, branchCode: event.target.value }))} /></div>
                  <div><label className="label" htmlFor="username">사용자명</label><input id="username" className="input" placeholder="예: branch_admin" value={leakageForm.username} onChange={(event) => setLeakageForm((current) => ({ ...current, username: event.target.value }))} /></div>
                  <div><label className="label" htmlFor="observed-at">예상 유출 시각</label><input id="observed-at" className="input" type="datetime-local" value={leakageForm.observedAt} onChange={(event) => setLeakageForm((current) => ({ ...current, observedAt: event.target.value }))} /></div>
                </div>

                <div>
                  <label className="label" htmlFor="capture-file">유출 캡처 파일</label>
                  <label className="file-upload-box" htmlFor="capture-file">
                    <span className="file-upload-button">파일 선택</span>
                    <span className={`file-upload-name ${selectedFileName ? "has-file" : ""}`}>{selectedFileName || "선택된 파일 없음"}</span>
                  </label>
                  <input id="capture-file" className="file-upload-input" type="file" accept="image/*" onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")} />
                </div>

                <div className="page-actions">
                  <button className="button primary" disabled={isLeakageLoading || !hasLeakageQuery} type="submit">{isLeakageLoading ? "후보 분석 중..." : "후보 찾기"}</button>
                  <button className="button secondary" disabled={isLeakageLoading} onClick={resetLeakageForm} type="button">입력 초기화</button>
                </div>
                {actionMessage ? <div className="muted" style={{ color: "var(--success)" }}>{actionMessage}</div> : null}
              </form>

              {leakageResult ? (
                <>
                  <div className="stats-grid">
                    <div className="stat-card"><div className="stat-label">찾은 후보</div><div className="stat-value">{leakageResult.summary.totalCandidates}</div></div>
                    <div className="stat-card"><div className="stat-label">검색 조건</div><div className="muted">세션 코드: {leakageResult.summary.searchedBy.sessionCodeFragment ?? "-"}<br />지사: {leakageResult.summary.searchedBy.branchCode ?? "-"}<br />사용자: {leakageResult.summary.searchedBy.username ?? "-"}</div></div>
                    <div className="stat-card"><div className="stat-label">정렬 기준</div><select className="input" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="confidence">일치 가능성 높은 순</option><option value="latest">최근 접속 순</option><option value="oldest">오래된 접속 순</option></select></div>
                  </div>
                  {sortedCandidates.length === 0 ? (
                    <div className="panel"><div className="muted">입력한 조건과 일치하는 세션 후보가 없습니다.</div></div>
                  ) : (
                    <div className="stack">
                      {sortedCandidates.map((candidate) => (
                        <div key={candidate.id} className="panel stack">
                          <div className="panel-header-inline">
                            <div><strong>{candidate.branchName}</strong> / {candidate.username}<div className="muted">세션 코드 끝자리: {candidate.sessionCodeTail} / 상태: {candidate.statusLabel} / 접속 IP: {candidate.ipAddress}</div></div>
                            <span className="badge">일치 단서 {candidate.confidenceScore}개</span>
                          </div>
                          <div className="page-actions">
                            <button className="button secondary" disabled={busyKey === `user-${candidate.userId}` || !candidate.userId} onClick={() => void handleBlockUser(candidate)} type="button">{busyKey === `user-${candidate.userId}` ? "계정 차단 중..." : "이 계정 차단"}</button>
                            <button className="button secondary" disabled={busyKey === `device-${candidate.deviceId}` || !candidate.deviceId} onClick={() => void handleBlockDevice(candidate)} type="button">{busyKey === `device-${candidate.deviceId}` ? "기기 차단 중..." : "이 기기 차단"}</button>
                          </div>
                          <div className="grid two">
                            <div className="metric-card stack">
                              <div className="stat-label">워터마크 단서</div>
                              <div className="content-break">{candidate.watermarkSummary}</div>
                              <div className="muted">일치한 기준: {candidate.matchedBy.length > 0 ? candidate.matchedBy.join(", ") : "없음"}</div>
                              <div className="muted">접속 시각: {candidate.startedAt}</div>
                              <div className="muted">연결된 기기: {candidate.deviceLabel ?? "확인 필요"}</div>
                            </div>
                            <div className="metric-card stack">
                              <div className="stat-label">최근 감사 로그</div>
                              {candidate.recentAuditLogs.length === 0 ? <div className="muted">관련 감사 로그가 없습니다.</div> : candidate.recentAuditLogs.map((log, index) => (
                                <div key={`${candidate.id}-audit-${index}`}><strong>{log.actionLabel}</strong><div className="muted">{log.createdAt}</div><div className="content-break">{log.summary}</div></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
