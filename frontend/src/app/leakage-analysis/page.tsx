"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LeakageCandidateResults } from "@/components/LeakageCandidateResults";
import * as mockApi from "@/lib/mock-api";
import {
  buildBranchOptions,
  buildLeakageCandidateQuery,
  createInitialLeakageSearchFormState,
  filterSessionsByBranchAndUser,
  filterUsersByBranch,
  leakageActionOptions,
  type LeakageSearchFormState
} from "@/lib/leakage-search";

type SortMode = "confidence" | "latest" | "oldest";

export default function LeakageAnalysisPage() {
  const [form, setForm] = useState<LeakageSearchFormState>(createInitialLeakageSearchFormState());
  const [sortMode, setSortMode] = useState<SortMode>("confidence");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<mockApi.LeakageCandidateSearchResult | null>(null);
  const [devices, setDevices] = useState<mockApi.DeviceSummary[]>([]);
  const [sessions, setSessions] = useState<mockApi.SessionSummary[]>([]);
  const [users, setUsers] = useState<mockApi.UserSummary[]>([]);
  const [selectedCompareDeviceId, setSelectedCompareDeviceId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const hasQuery = useMemo(
    () => Object.values(form).some((value) => value.trim().length > 0) || Boolean(selectedCompareDeviceId),
    [form, selectedCompareDeviceId]
  );

  const branchOptions = useMemo(() => buildBranchOptions(users), [users]);
  const userOptions = useMemo(() => filterUsersByBranch(users, form.branchCode), [form.branchCode, users]);
  const sessionOptions = useMemo(() => filterSessionsByBranchAndUser(sessions, form.branchCode, form.username), [form.branchCode, form.username, sessions]);

  const sortedCandidates = useMemo(() => {
    if (!result) {
      return [];
    }

    const nextCandidates = [...result.candidates];
    nextCandidates.sort((left, right) => {
      if (sortMode === "latest") {
        return right.startedAt.localeCompare(left.startedAt);
      }

      if (sortMode === "oldest") {
        return left.startedAt.localeCompare(right.startedAt);
      }

      return right.confidenceScore - left.confidenceScore || right.startedAt.localeCompare(left.startedAt);
    });

    return nextCandidates;
  }, [result, sortMode]);
  const selectedDeviceLabel = useMemo(
    () => devices.find((device) => device.id === result?.summary.searchedBy.deviceId)?.label ?? devices.find((device) => device.id === selectedCompareDeviceId)?.label ?? "",
    [devices, result?.summary.searchedBy.deviceId, selectedCompareDeviceId]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const [nextDevices, nextSessions, nextUsers] = await Promise.all([
        mockApi.fetchDevices(),
        mockApi.fetchSessions(),
        mockApi.fetchUsers()
      ]);
      if (cancelled) return;
      setDevices(nextDevices);
      setSessions(nextSessions);
      setUsers(nextUsers);
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setActionMessage("");

    try {
      const nextResult = await mockApi.fetchLeakageCandidates(
        buildLeakageCandidateQuery({
          sessionCodeFragment: form.sessionCodeFragment,
          branchCode: form.branchCode,
          deviceId: selectedCompareDeviceId,
          username: form.username,
          auditActionType: form.auditActionType
        })
      );
      setResult(nextResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "유출 후보 분석을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setForm(createInitialLeakageSearchFormState());
    setResult(null);
    setError("");
    setActionMessage("");
    setSelectedCompareDeviceId("");
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

  return (
    <div className="page-wrap">
      <PageHeader
        title="유출 분석"
      />

      <form className="panel stack" onSubmit={handleSubmit}>
        <div className="panel-header-inline">
          <div>
            <div className="panel-title">접속 로그 기준 후보 조회</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div>
            <label className="label" htmlFor="leakage-device">기기 선택</label>
            <select id="leakage-device" className="input" value={selectedCompareDeviceId} onChange={(event) => setSelectedCompareDeviceId(event.target.value)}>
              <option value="">전체 기기</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.branch} / {device.label} / {device.user}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="session-code-fragment">세션 선택</label>
            <select
              id="session-code-fragment"
              className="input"
              value={form.sessionCodeFragment}
              onChange={(event) => setForm((current) => ({ ...current, sessionCodeFragment: event.target.value }))}
            >
              <option value="">전체 세션</option>
              {sessionOptions.map((session) => (
                <option key={session.id} value={session.sessionKey}>
                  {session.branch} / {session.username} / {session.deviceLabel} / {session.sessionKeyTail}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="branch-code">지사 선택</label>
            <select
              id="branch-code"
              className="input"
              value={form.branchCode}
              onChange={(event) => setForm((current) => ({ ...current, branchCode: event.target.value, username: "", sessionCodeFragment: "" }))}
            >
              <option value="">전체 지사</option>
              {branchOptions.map((branch) => (
                <option key={branch.code} value={branch.code}>
                  {branch.name} / {branch.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="username">사용자 선택</label>
            <select
              id="username"
              className="input"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value, sessionCodeFragment: "" }))}
            >
              <option value="">전체 사용자</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.username}>
                  {user.username} / {user.branchName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="audit-action-type">행동 선택</label>
            <select
              id="audit-action-type"
              className="input"
              value={form.auditActionType}
              onChange={(event) => setForm((current) => ({ ...current, auditActionType: event.target.value }))}
            >
              {leakageActionOptions.map((action) => (
                <option key={action.value || "all"} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="page-actions" style={{ justifyContent: "flex-end" }}>
          <button className="button primary" disabled={isLoading || !hasQuery} type="submit">
            {isLoading ? "후보 분석 중..." : "후보 찾기"}
          </button>
          <button className="button secondary" disabled={isLoading} onClick={resetForm} type="button">
            입력 초기화
          </button>
        </div>

        {error ? <div className="muted" style={{ color: "var(--danger)" }}>{error}</div> : null}
        {actionMessage ? <div className="muted" style={{ color: "var(--success)" }}>{actionMessage}</div> : null}
      </form>

      {result ? (
        <LeakageCandidateResults
          busyKey={busyKey}
          onBlockDevice={(candidate) => void handleBlockDevice(candidate)}
          onBlockUser={(candidate) => void handleBlockUser(candidate)}
          onSortModeChange={setSortMode}
          result={result}
          selectedDeviceLabel={selectedDeviceLabel}
          sortMode={sortMode}
          sortedCandidates={sortedCandidates}
        />
      ) : null}
    </div>
  );
}
