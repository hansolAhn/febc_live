"use client";

import { useEffect, useMemo, useState } from "react";
import { ActiveSessionTable } from "@/components/ActiveSessionTable";
import { PageHeader } from "@/components/PageHeader";
import { SecurityEventTable } from "@/components/SecurityEventTable";
import { useAuditLogFilters } from "@/hooks/useAuditLogFilters";
import * as mockApi from "@/lib/mock-api";

export default function SecurityEventsPage() {
  const [activeTab, setActiveTab] = useState<"events" | "audit" | "sessions">("events");
  const [events, setEvents] = useState<Awaited<ReturnType<typeof mockApi.fetchSecurityEvents>>>([]);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof mockApi.fetchSessions>>>([]);
  const [auditLogs, setAuditLogs] = useState<mockApi.AuditLogItem[]>([]);
  const [loginAttemptLogs, setLoginAttemptLogs] = useState<mockApi.LoginAttemptLogItem[]>([]);
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");
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
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "events" || tab === "audit" || tab === "sessions") {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      const [eventData, sessionData, auditData, loginData] = await Promise.all([
        mockApi.fetchSecurityEvents(),
        mockApi.fetchSessions(),
        mockApi.fetchAuditLogs(),
        mockApi.fetchLoginAttemptLogs()
      ]);

      setEvents(eventData);
      setSessions(sessionData);
      setAuditLogs(auditData);
      setLoginAttemptLogs(loginData);
    }

    void loadAll().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "보안 정보를 불러오지 못했습니다.");
    });
  }, []);

  const filteredEvents = useMemo(() => {
    if (severityFilter === "all") return events;
    return events.filter((event) => event.severity === severityFilter);
  }, [events, severityFilter]);

  const counts = useMemo(
    () => ({
      all: events.length,
      high: events.filter((event) => event.severity === "high").length,
      medium: events.filter((event) => event.severity === "medium").length,
      low: events.filter((event) => event.severity === "low").length
    }),
    [events]
  );

  const sortedSessions = useMemo(() => {
    const priority = (status: string) => {
      if (status === "사용 중") return 0;
      if (status === "종료됨") return 1;
      if (status === "만료됨") return 2;
      if (status === "차단됨") return 3;
      return 4;
    };

    return [...sessions].sort((a, b) => {
      const byStatus = priority(a.status) - priority(b.status);
      if (byStatus !== 0) return byStatus;
      return b.startedAt.localeCompare(a.startedAt);
    });
  }, [sessions]);

  return (
    <div className="page-wrap">
      <PageHeader title="보안 이벤트" />

      <div className="tab-bar">
        <button className={activeTab === "events" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("events")} type="button">
          보안 이벤트
        </button>
        <button className={activeTab === "audit" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("audit")} type="button">
          감사 로그
        </button>
        <button className={activeTab === "sessions" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("sessions")} type="button">
          접속 세션
        </button>
      </div>

      {error ? <div className="panel">{error}</div> : null}

      {activeTab === "events" ? (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-label">전체 이벤트</div><div className="stat-value">{counts.all}</div></div>
            <div className="stat-card"><div className="stat-label">고위험</div><div className="stat-value">{counts.high}</div></div>
            <div className="stat-card"><div className="stat-label">중위험</div><div className="stat-value">{counts.medium}</div></div>
            <div className="stat-card"><div className="stat-label">저위험</div><div className="stat-value">{counts.low}</div></div>
          </div>

          <div className="panel">
            <div className="page-actions" style={{ marginBottom: 16 }}>
              <button className={severityFilter === "all" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("all")} type="button">
                전체
              </button>
              <button className={severityFilter === "high" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("high")} type="button">
                고위험
              </button>
              <button className={severityFilter === "medium" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("medium")} type="button">
                중위험
              </button>
              <button className={severityFilter === "low" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("low")} type="button">
                저위험
              </button>
            </div>
            <SecurityEventTable events={filteredEvents} />
          </div>
        </>
      ) : null}

      {activeTab === "audit" ? (
        <>
          <div className="panel stack">
            <div className="panel-title">로그 검색</div>
            <div className="filter-toolbar">
              <div className="filter-field filter-field-time">
                <label className="label" htmlFor="audit-observed-at">시각</label>
                <input id="audit-observed-at" className="input" type="datetime-local" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} />
              </div>
              <div className="filter-field filter-field-select">
                <label className="label" htmlFor="audit-event">이벤트</label>
                <select id="audit-event" className="input" value={selectedEvent} onChange={(event) => setSelectedEvent(event.target.value)}>
                  {auditEventOptions.map((item) => (
                    <option key={item} value={item}>
                      {item === "ALL" ? "전체" : item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-field filter-field-text">
                <label className="label" htmlFor="audit-username">아이디</label>
                <input id="audit-username" className="input" type="text" placeholder="예: branch_admin" value={usernameKeyword} onChange={(event) => setUsernameKeyword(event.target.value)} />
              </div>
              <div className="filter-field filter-field-select">
                <label className="label" htmlFor="audit-branch">소속</label>
                <select id="audit-branch" className="input" value={branchKeyword} onChange={(event) => setBranchKeyword(event.target.value)}>
                  {branchOptions.map((item) => (
                    <option key={item} value={item}>
                      {item === "ALL" ? "전체" : item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-field filter-field-ip">
                <label className="label" htmlFor="audit-ip">IP 주소</label>
                <input id="audit-ip" className="input" type="text" placeholder="예: 172.18.0.1" value={ipKeyword} onChange={(event) => setIpKeyword(event.target.value)} />
              </div>
              <div className="filter-field filter-field-action">
                <label className="label filter-spacer">초기화</label>
                <button className="secondary-button" type="button" onClick={resetFilters}>초기화</button>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">운영 기록</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>시각</th><th>이벤트</th><th>소속</th><th>접속 IP</th><th>상세 설명</th></tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id}><td>{log.createdAt}</td><td>{log.actionLabel}</td><td>{log.branchLabel}</td><td>{log.actorIp}</td><td>{log.payloadSummary}</td></tr>
                  ))}
                  {filteredAuditLogs.length === 0 ? <tr><td colSpan={5}>검색 조건과 맞는 운영 기록이 없습니다.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">로그인 시도 기록</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>시각</th><th>아이디</th><th>소속</th><th>시도 IP</th><th>결과</th><th>실패 사유</th></tr>
                </thead>
                <tbody>
                  {filteredLoginAttemptLogs.map((log) => (
                    <tr key={log.id}><td>{log.createdAt}</td><td>{log.username}</td><td>{log.branchLabel}</td><td>{log.attemptIp}</td><td>{log.resultLabel}</td><td>{log.failureReasonLabel}</td></tr>
                  ))}
                  {filteredLoginAttemptLogs.length === 0 ? <tr><td colSpan={6}>검색 조건과 맞는 로그인 시도 기록이 없습니다.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === "sessions" ? (
        <div className="grid">
          <ActiveSessionTable sessions={sortedSessions} title="접속 세션 목록" />
        </div>
      ) : null}
    </div>
  );
}
