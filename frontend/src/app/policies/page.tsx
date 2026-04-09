"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PolicyToggleCard } from "@/components/PolicyToggleCard";
import { useAuth } from "@/components/providers/AuthProvider";
import * as mockApi from "@/lib/mock-api";

type Policy = Awaited<ReturnType<typeof mockApi.fetchPolicies>>[number];
type AuditLog = Awaited<ReturnType<typeof mockApi.fetchAuditLogs>>[number];
type UserSummary = Awaited<ReturnType<typeof mockApi.fetchUsers>>[number];

export default function PoliciesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const branchCode = user?.branchCode ?? null;

  const [branchPolicies, setBranchPolicies] = useState<Policy[]>([]);
  const [userPolicies, setUserPolicies] = useState<Policy[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUserPolicyLoading, setIsUserPolicyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"policy" | "history">("policy");

  const selectedUser = useMemo(() => users.find((item) => item.id === selectedUserId) ?? null, [selectedUserId, users]);

  async function loadBranchPolicyData(targetBranchCode: string) {
    const [policyData, auditLogData, userData] = await Promise.all([
      mockApi.fetchPolicies(targetBranchCode),
      mockApi.fetchAuditLogs(),
      mockApi.fetchUsers()
    ]);

    const branchUsers = userData.filter((item) => item.roleCode !== "SUPER_ADMIN");

    return {
      policyData,
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
        const { policyData, auditLogData, branchUsers } = await loadBranchPolicyData(targetBranchCode);
        if (cancelled) return;
        setBranchPolicies(policyData);
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
      setError(updateError instanceof Error ? updateError.message : "소속 정책 변경에 실패했습니다.");
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

  if (isAuthLoading) {
    return <div className="login-shell"><div className="panel">로그인 상태를 확인하는 중입니다...</div></div>;
  }
  if (!branchCode) {
    return <div className="login-shell"><div className="panel">로그인 화면으로 이동하는 중입니다...</div></div>;
  }

  return (
    <div className="page-wrap">
      <PageHeader title="소속별 정책 관리" />

      {error ? <div className="panel">{error}</div> : null}
      {isLoading ? <div className="panel">정책 데이터를 불러오는 중입니다...</div> : null}

      {!isLoading ? (
        <>
          <div className="tab-bar">
            <button className={activeTab === "policy" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("policy")} type="button">
              기본 정책 / 사용자 예외
            </button>
            <button className={activeTab === "history" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("history")} type="button">
              변경 이력
            </button>
          </div>

          {activeTab === "policy" ? (
            <>
              <div className="panel stack">
                <div className="panel-title">기본 정책</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                  {branchPolicies.map((policy) => (
                    <PolicyToggleCard key={policy.id} title={policy.title} description={policy.description} enabled={policy.enabled} onToggle={() => void toggleBranchPolicy(policy)} />
                  ))}
                </div>
              </div>

              <div className="panel stack">
                <div className="panel-header-inline">
                  <div>
                    <div className="panel-title">사용자별 예외 정책</div>
                  </div>
                  <div style={{ minWidth: 260 }}>
                    <label className="label" htmlFor="policy-user-select">사용자 선택</label>
                    <select id="policy-user-select" className="input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} disabled={users.length === 0}>
                      {users.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.username} / {item.roleCode === "SUPER_ADMIN" ? "master" : "guest"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedUser ? <div className="muted">선택 계정: {selectedUser.username} / 상태: {selectedUser.isActive ? "사용 가능" : "차단됨"}</div> : <div className="muted">소속에 등록된 사용자가 없습니다.</div>}

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
          ) : (
            <div className="panel">
              <div className="panel-title">최근 정책 변경 감사 로그</div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>시각</th>
                      <th>이벤트</th>
                      <th>소속</th>
                      <th>IP</th>
                      <th>변경 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.createdAt}</td>
                        <td>{log.actionLabel}</td>
                        <td>{log.branchLabel}</td>
                        <td>{log.actorIp}</td>
                        <td>{log.payloadSummary}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 ? <tr><td colSpan={5}>아직 기록된 정책 변경 감사 로그가 없습니다.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
