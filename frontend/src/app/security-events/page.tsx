"use client";

import { useEffect, useMemo, useState } from "react";
import { ActiveSessionTable } from "@/components/ActiveSessionTable";
import { DeviceList } from "@/components/DeviceList";
import { PageHeader } from "@/components/PageHeader";
import { SecurityEventTable } from "@/components/SecurityEventTable";
import * as mockApi from "@/lib/mock-api";

type AuditLog = Awaited<ReturnType<typeof mockApi.fetchAuditLogs>>[number];
type LoginAttemptLog = Awaited<ReturnType<typeof mockApi.fetchLoginAttemptLogs>>[number];

function matchesObservedAt(value: string, observedAt: string) {
  if (!observedAt) return true;

  const current = new Date(value);
  const target = new Date(observedAt);
  if (Number.isNaN(current.getTime()) || Number.isNaN(target.getTime())) return false;

  return Math.abs(current.getTime() - target.getTime()) <= 12 * 60 * 60 * 1000;
}

export default function SecurityEventsPage() {
  const [activeTab, setActiveTab] = useState<"events" | "audit" | "sessions" | "devices">("events");
  const [events, setEvents] = useState<Awaited<ReturnType<typeof mockApi.fetchSecurityEvents>>>([]);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof mockApi.fetchSessions>>>([]);
  const [devices, setDevices] = useState<Awaited<ReturnType<typeof mockApi.fetchDevices>>>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loginAttemptLogs, setLoginAttemptLogs] = useState<LoginAttemptLog[]>([]);
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [observedAt, setObservedAt] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [usernameKeyword, setUsernameKeyword] = useState("");
  const [branchKeyword, setBranchKeyword] = useState("ALL");
  const [ipKeyword, setIpKeyword] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "events" || tab === "audit" || tab === "sessions" || tab === "devices") {
      setActiveTab(tab);
    }
  }, []);

  async function loadAll() {
    const [eventData, sessionData, deviceData, auditData, loginData] = await Promise.all([
      mockApi.fetchSecurityEvents(),
      mockApi.fetchSessions(),
      mockApi.fetchDevices(),
      mockApi.fetchAuditLogs(),
      mockApi.fetchLoginAttemptLogs()
    ]);
    setEvents(eventData);
    setSessions(sessionData);
    setDevices(deviceData);
    setAuditLogs(auditData);
    setLoginAttemptLogs(loginData);
  }

  useEffect(() => {
    loadAll().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "보안 관리 정보를 불러오지 못했습니다.");
    });
  }, []);

  async function approveDevice(deviceId: string) {
    setBusyDeviceId(deviceId);
    setError(null);
    try {
      await mockApi.approveDevice(deviceId);
      await loadAll();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "기기 승인을 완료하지 못했습니다.");
    } finally {
      setBusyDeviceId(null);
    }
  }

  async function blockDevice(deviceId: string) {
    setBusyDeviceId(deviceId);
    setError(null);
    try {
      await mockApi.blockDevice(deviceId);
      await loadAll();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "기기 차단을 완료하지 못했습니다.");
    } finally {
      setBusyDeviceId(null);
    }
  }

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

  const auditEventOptions = useMemo(() => ["ALL", ...Array.from(new Set(auditLogs.map((log) => log.actionLabel))).sort()], [auditLogs]);
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
      if (!matchesObservedAt(log.createdAt, observedAt)) return false;
      if (selectedEvent !== "ALL" && log.actionLabel !== selectedEvent) return false;
      if (branchKeyword !== "ALL" && log.branchLabel !== branchKeyword) return false;
      if (usernameNeedle && !log.payloadSummary.toLowerCase().includes(usernameNeedle)) return false;
      if (ipNeedle && !log.actorIp.toLowerCase().includes(ipNeedle)) return false;
      return true;
    });
  }, [auditLogs, branchKeyword, ipKeyword, observedAt, selectedEvent, usernameKeyword]);

  const filteredLoginAttemptLogs = useMemo(() => {
    const usernameNeedle = usernameKeyword.trim().toLowerCase();
    const ipNeedle = ipKeyword.trim().toLowerCase();
    return loginAttemptLogs.filter((log) => {
      if (!matchesObservedAt(log.createdAt, observedAt)) return false;
      if (branchKeyword !== "ALL" && log.branchLabel !== branchKeyword) return false;
      if (usernameNeedle && !log.username.toLowerCase().includes(usernameNeedle)) return false;
      if (ipNeedle && !log.attemptIp.toLowerCase().includes(ipNeedle)) return false;
      if (selectedEvent !== "ALL") {
        const selected = selectedEvent.replaceAll(" ", "");
        if (!log.resultLabel.replaceAll(" ", "").includes(selected) && !log.failureReasonLabel.replaceAll(" ", "").includes(selected)) {
          return false;
        }
      }
      return true;
    });
  }, [branchKeyword, ipKeyword, loginAttemptLogs, observedAt, selectedEvent, usernameKeyword]);

  const sortedSessions = useMemo(() => {
    const priority = (status: string) => {
      if (status === "사용 중" || status === "접속 중") return 0;
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

  function resetFilters() {
    setObservedAt("");
    setSelectedEvent("ALL");
    setUsernameKeyword("");
    setBranchKeyword("ALL");
    setIpKeyword("");
  }

  return (
    <div className="page-wrap">
      <PageHeader title="보안 이벤트" subtitle="보안 이벤트, 감사 로그, 접속 세션, 등록 기기 정보를 한 화면에서 확인합니다." />

      <div className="tab-bar">
        <button className={activeTab === "events" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("events")} type="button">보안 이벤트</button>
        <button className={activeTab === "audit" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("audit")} type="button">감사 로그</button>
        <button className={activeTab === "sessions" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("sessions")} type="button">접속 세션</button>
        <button className={activeTab === "devices" ? "secondary-button is-active" : "secondary-button"} onClick={() => setActiveTab("devices")} type="button">등록 기기 관리</button>
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
              <button className={severityFilter === "all" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("all")} type="button">전체</button>
              <button className={severityFilter === "high" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("high")} type="button">고위험</button>
              <button className={severityFilter === "medium" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("medium")} type="button">중위험</button>
              <button className={severityFilter === "low" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("low")} type="button">저위험</button>
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
                  {auditEventOptions.map((item) => <option key={item} value={item}>{item === "ALL" ? "전체" : item}</option>)}
                </select>
              </div>
              <div className="filter-field filter-field-text">
                <label className="label" htmlFor="audit-username">아이디</label>
                <input id="audit-username" className="input" type="text" placeholder="예: branch_admin" value={usernameKeyword} onChange={(event) => setUsernameKeyword(event.target.value)} />
              </div>
              <div className="filter-field filter-field-select">
                <label className="label" htmlFor="audit-branch">지사</label>
                <select id="audit-branch" className="input" value={branchKeyword} onChange={(event) => setBranchKeyword(event.target.value)}>
                  {branchOptions.map((item) => <option key={item} value={item}>{item === "ALL" ? "전체" : item}</option>)}
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
                  <tr><th>시각</th><th>이벤트</th><th>지사</th><th>접속 IP</th><th>상세 설명</th></tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id}><td>{log.createdAt}</td><td>{log.actionLabel}</td><td>{log.branchLabel}</td><td>{log.actorIp}</td><td>{log.payloadSummary}</td></tr>
                  ))}
                  {filteredAuditLogs.length === 0 ? <tr><td colSpan={5}>검색 조건에 맞는 운영 기록이 없습니다.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">로그인 시도 기록</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>시각</th><th>아이디</th><th>지사</th><th>시도 IP</th><th>결과</th><th>실패 사유</th></tr>
                </thead>
                <tbody>
                  {filteredLoginAttemptLogs.map((log) => (
                    <tr key={log.id}><td>{log.createdAt}</td><td>{log.username}</td><td>{log.branchLabel}</td><td>{log.attemptIp}</td><td>{log.resultLabel}</td><td>{log.failureReasonLabel}</td></tr>
                  ))}
                  {filteredLoginAttemptLogs.length === 0 ? <tr><td colSpan={6}>검색 조건에 맞는 로그인 시도 기록이 없습니다.</td></tr> : null}
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

      {activeTab === "devices" ? (
        <div className="grid">
          <DeviceList busyDeviceId={busyDeviceId} devices={devices} onApprove={approveDevice} onBlock={blockDevice} />
        </div>
      ) : null}
    </div>
  );
}
