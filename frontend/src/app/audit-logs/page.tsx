"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuditLogFilters } from "@/hooks/useAuditLogFilters";
import * as mockApi from "@/lib/mock-api";

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<mockApi.AuditLogItem[]>([]);
  const [loginAttemptLogs, setLoginAttemptLogs] = useState<mockApi.LoginAttemptLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    observedAt,
    setObservedAt,
    selectedEvent,
    setSelectedEvent,
    usernameKeyword,
    setUsernameKeyword,
    branchKeyword,
    setBranchKeyword,
    ipKeyword,
    setIpKeyword,
    auditEventOptions,
    branchOptions,
    filteredAuditLogs,
    filteredLoginAttemptLogs,
    resetFilters
  } = useAuditLogFilters(auditLogs, loginAttemptLogs);

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

  return (
    <div className="page-wrap">
      <PageHeader title="감사 로그" />

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
                <label className="label" htmlFor="audit-branch">소속</label>
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
                    <th>소속</th>
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
                      <td colSpan={5}>검색 조건과 맞는 운영 기록이 없습니다.</td>
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
                    <th>소속</th>
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
                      <td colSpan={6}>검색 조건과 맞는 로그인 시도 기록이 없습니다.</td>
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
