"use client";

import { useEffect, useMemo, useState } from "react";
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

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

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
      auditLogData: auditLogData
        .filter((log) => log.actionType.includes("SECURITY_POLICY"))
        .slice(0, 10),
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

    const currentBranchCode: string = branchCode;

    let cancelled = false;

    async function load() {
      const targetBranchCode = currentBranchCode;

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

        const nextSelectedUserId = branchUsers[0]?.id ?? "";
        setSelectedUserId(nextSelectedUserId);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "정책 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
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
        if (cancelled) return;
        setUserPolicies(nextPolicies);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "사용자별 정책을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) {
          setIsUserPolicyLoading(false);
        }
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
      const [nextUserPolicies, nextAuditLogs] = await Promise.all([
        loadUserPolicyData(selectedUserId),
        mockApi.fetchAuditLogs()
      ]);
      setUserPolicies(nextUserPolicies);
      setAuditLogs(nextAuditLogs.filter((log) => log.actionType.includes("SECURITY_POLICY")).slice(0, 10));
    } catch (updateError) {
      setUserPolicies((current) => current.map((item) => (item.id === policy.id ? { ...item, enabled: policy.enabled } : item)));
      setError(updateError instanceof Error ? updateError.message : "사용자별 정책 변경에 실패했습니다.");
    }
  }

  if (isAuthLoading) {
    return (
      <div className="login-shell">
        <div className="panel">로그인 상태를 확인하는 중입니다...</div>
      </div>
    );
  }

  if (!branchCode) {
    return (
      <div className="login-shell">
        <div className="panel">로그인 화면으로 이동하는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <PageHeader
        title="지사별 정책 관리"
        subtitle="지사 전체 정책과 특정 계정 예외 정책을 한 화면에서 확인하고 변경할 수 있습니다."
      />

      {error ? <div className="panel">{error}</div> : null}
      {isLoading ? <div className="panel">정책 데이터를 불러오는 중입니다...</div> : null}

      {!isLoading ? (
        <>
          <div className="panel stack">
            <div className="panel-title">지사 기본 정책</div>
            <div className="grid two">
              {branchPolicies.map((policy) => (
                <PolicyToggleCard
                  key={policy.id}
                  title={policy.title}
                  description={policy.description}
                  enabled={policy.enabled}
                  onToggle={() => void toggleBranchPolicy(policy)}
                />
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
                <select
                  id="policy-user-select"
                  className="input"
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                >
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.username} / {item.roleCode === "SUPER_ADMIN" ? "최고 관리자" : item.roleCode === "BRANCH_ADMIN" ? "지사 관리자" : "시청자"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedUser ? (
              <div className="muted">
                선택 계정: {selectedUser.username} / 상태: {selectedUser.isActive ? "사용 가능" : "차단됨"}
              </div>
            ) : (
              <div className="muted">지사에 등록된 사용자가 없습니다.</div>
            )}

            {selectedUser && !isUserPolicyLoading ? (
              <div className="grid two">
                {userPolicies.map((policy) => (
                  <PolicyToggleCard
                    key={`user-${selectedUser.id}-${policy.id}`}
                    title={policy.title}
                    description=""
                    enabled={policy.enabled}
                    onToggle={() => void toggleUserPolicy(policy)}
                  />
                ))}
              </div>
            ) : null}

            {selectedUser && isUserPolicyLoading ? <div className="muted">사용자별 예외 정책을 불러오는 중입니다...</div> : null}
          </div>

          <div className="panel">
            <div className="panel-title">지사 로고 프로필</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>지사 코드</th>
                    <th>프로필명</th>
                    <th>버전</th>
                    <th>보이는 워터마크</th>
                    <th>숨은 워터마크</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td>{profile.branchCode}</td>
                      <td>{profile.profileName}</td>
                      <td>v{profile.profileVersion}</td>
                      <td>
                        {String(profile.visibleWatermarkConfig.logoVariant ?? "기본형")} / shift {String(profile.visibleWatermarkConfig.microShift ?? "0px")}
                      </td>
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
                <thead>
                  <tr>
                    <th>이벤트 코드</th>
                    <th>지사 코드</th>
                    <th>세션 코드</th>
                    <th>프로필 ID</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>{assignment.eventCode}</td>
                      <td>{assignment.branchCode}</td>
                      <td>{assignment.sessionCode}</td>
                      <td>{assignment.profileId}</td>
                    </tr>
                  ))}
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={4}>현재 지사에 배정된 이벤트 로고가 없습니다.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">최근 정책 변경 감사 로그</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>시각</th>
                    <th>이벤트</th>
                    <th>지사</th>
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
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5}>아직 기록된 정책 변경 감사 로그가 없습니다.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
