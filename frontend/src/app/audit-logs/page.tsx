"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import * as mockApi from "@/lib/mock-api";

type AuditLog = Awaited<ReturnType<typeof mockApi.fetchAuditLogs>>[number];
type LoginAttemptLog = Awaited<ReturnType<typeof mockApi.fetchLoginAttemptLogs>>[number];

function matchesObservedAt(value: string, observedAt: string) {
  if (!observedAt) {
    return true;
  }

  const current = new Date(value);
  const target = new Date(observedAt);

  if (Number.isNaN(current.getTime()) || Number.isNaN(target.getTime())) {
    return false;
  }

  const gap = Math.abs(current.getTime() - target.getTime());
  return gap <= 12 * 60 * 60 * 1000;
}

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loginAttemptLogs, setLoginAttemptLogs] = useState<LoginAttemptLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [observedAt, setObservedAt] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [usernameKeyword, setUsernameKeyword] = useState("");
  const [branchKeyword, setBranchKeyword] = useState("ALL");
  const [ipKeyword, setIpKeyword] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [auditLogData, loginAttemptData] = await Promise.all([
          mockApi.fetchAuditLogs(),
          mockApi.fetchLoginAttemptLogs()
        ]);

        if (cancelled) return;

        setAuditLogs(auditLogData);
        setLoginAttemptLogs(loginAttemptData);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "감사 로그를 불러오지 못했습니다.");
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
  }, []);

  const auditEventOptions = useMemo(() => {
    const unique = Array.from(new Set(auditLogs.map((log) => log.actionLabel))).sort();
    return ["ALL", ...unique];
  }, [auditLogs]);

  const branchOptions = useMemo(() => {
    const unique = Array.from(
      new Set([
        ...auditLogs.map((log) => log.branchLabel).filter(Boolean),
        ...loginAttemptLogs.map((log) => log.branchLabel).filter(Boolean)
      ])
    ).sort();

    return ["ALL", ...unique];
  }, [auditLogs, loginAttemptLogs]);

  const filteredAuditLogs = useMemo(() => {
    const usernameNeedle = usernameKeyword.trim().toLowerCase();
    const ipNeedle = ipKeyword.trim().toLowerCase();

    return auditLogs.filter((log) => {
      if (!matchesObservedAt(log.createdAt, observedAt)) {
        return false;
      }

      if (selectedEvent !== "ALL" && log.actionLabel !== selectedEvent) {
        return false;
      }

      if (branchKeyword !== "ALL" && log.branchLabel !== branchKeyword) {
        return false;
      }

      if (usernameNeedle && !log.payloadSummary.toLowerCase().includes(usernameNeedle)) {
        return false;
      }

      if (ipNeedle && !log.actorIp.toLowerCase().includes(ipNeedle)) {
        return false;
      }

      return true;
    });
  }, [auditLogs, branchKeyword, ipKeyword, observedAt, selectedEvent, usernameKeyword]);

  const filteredLoginAttemptLogs = useMemo(() => {
    const usernameNeedle = usernameKeyword.trim().toLowerCase();
    const ipNeedle = ipKeyword.trim().toLowerCase();

    return loginAttemptLogs.filter((log) => {
      if (!matchesObservedAt(log.createdAt, observedAt)) {
        return false;
      }

      if (branchKeyword !== "ALL" && log.branchLabel !== branchKeyword) {
        return false;
      }

      if (usernameNeedle && !log.username.toLowerCase().includes(usernameNeedle)) {
        return false;
      }

      if (ipNeedle && !log.attemptIp.toLowerCase().includes(ipNeedle)) {
        return false;
      }

      if (selectedEvent !== "ALL") {
        const normalizedSelectedEvent = selectedEvent.replaceAll(" ", "");
        const normalizedResult = log.resultLabel.replaceAll(" ", "");
        const normalizedReason = log.failureReasonLabel.replaceAll(" ", "");

        if (!normalizedResult.includes(normalizedSelectedEvent) && !normalizedReason.includes(normalizedSelectedEvent)) {
          return false;
        }
      }

      return true;
    });
  }, [branchKeyword, ipKeyword, loginAttemptLogs, observedAt, selectedEvent, usernameKeyword]);

  function resetFilters() {
    setObservedAt("");
    setSelectedEvent("ALL");
    setUsernameKeyword("");
    setBranchKeyword("ALL");
    setIpKeyword("");
  }

  return (
    <div className="page-wrap">
      <PageHeader
        title="감사 로그"
        subtitle="로그인 성공과 실패, 정책 변경, 로그아웃 같은 운영 이력을 조건별로 검색해서 확인합니다."
      />

      {error ? <div className="panel">{error}</div> : null}
      {isLoading ? <div className="panel">감사 로그를 불러오는 중입니다...</div> : null}

      {!isLoading ? (
        <>
          <div className="panel stack">
            <div className="panel-title">로그 검색</div>

            <div className="filter-toolbar">
              <div className="filter-field filter-field-time">
                <label className="label" htmlFor="audit-observed-at">시각</label>
                <input
                  id="audit-observed-at"
                  className="input"
                  type="datetime-local"
                  value={observedAt}
                  onChange={(event) => setObservedAt(event.target.value)}
                />
              </div>

              <div className="filter-field filter-field-select">
                <label className="label" htmlFor="audit-event">이벤트</label>
                <select
                  id="audit-event"
                  className="input"
                  value={selectedEvent}
                  onChange={(event) => setSelectedEvent(event.target.value)}
                >
                  <option value="ALL">전체</option>
                  {auditEventOptions
                    .filter((item) => item !== "ALL")
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </select>
              </div>

              <div className="filter-field filter-field-text">
                <label className="label" htmlFor="audit-username">아이디</label>
                <input
                  id="audit-username"
                  className="input"
                  type="text"
                  placeholder="예: branch_admin"
                  value={usernameKeyword}
                  onChange={(event) => setUsernameKeyword(event.target.value)}
                />
              </div>

              <div className="filter-field filter-field-select">
                <label className="label" htmlFor="audit-branch">지사</label>
                <select
                  id="audit-branch"
                  className="input"
                  value={branchKeyword}
                  onChange={(event) => setBranchKeyword(event.target.value)}
                >
                  <option value="ALL">전체</option>
                  {branchOptions
                    .filter((item) => item !== "ALL")
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </select>
              </div>

              <div className="filter-field filter-field-ip">
                <label className="label" htmlFor="audit-ip">IP 주소</label>
                <input
                  id="audit-ip"
                  className="input"
                  type="text"
                  placeholder="예: 172.18.0.1"
                  value={ipKeyword}
                  onChange={(event) => setIpKeyword(event.target.value)}
                />
              </div>

              <div className="filter-field filter-field-action">
                <label className="label filter-spacer">초기화</label>
                <button className="secondary-button" type="button" onClick={resetFilters}>
                  초기화
                </button>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">운영 기록</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>시각</th>
                    <th>이벤트</th>
                    <th>지사</th>
                    <th>접속 IP</th>
                    <th>상세 설명</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.createdAt}</td>
                      <td>{log.actionLabel}</td>
                      <td>{log.branchLabel}</td>
                      <td>{log.actorIp}</td>
                      <td>{log.payloadSummary}</td>
                    </tr>
                  ))}
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5}>검색 조건에 맞는 운영 기록이 없습니다.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">로그인 시도 기록</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>시각</th>
                    <th>아이디</th>
                    <th>지사</th>
                    <th>시도 IP</th>
                    <th>결과</th>
                    <th>실패 사유</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoginAttemptLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.createdAt}</td>
                      <td>{log.username}</td>
                      <td>{log.branchLabel}</td>
                      <td>{log.attemptIp}</td>
                      <td>{log.resultLabel}</td>
                      <td>{log.failureReasonLabel}</td>
                    </tr>
                  ))}
                  {filteredLoginAttemptLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6}>검색 조건에 맞는 로그인 시도 기록이 없습니다.</td>
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
