"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SecurityEventTable } from "@/components/SecurityEventTable";
import * as mockApi from "@/lib/mock-api";

export default function SecurityEventsPage() {
  const [events, setEvents] = useState<Awaited<ReturnType<typeof mockApi.fetchSecurityEvents>>>([]);
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  useEffect(() => {
    mockApi.fetchSecurityEvents().then(setEvents);
  }, []);

  const filteredEvents = useMemo(() => {
    if (severityFilter === "all") {
      return events;
    }

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

  return (
    <div className="page-wrap">
      <PageHeader title="보안 이벤트" subtitle="차단된 로그인, 허용되지 않은 접근, 세션 강제 전환 같은 이상 행위를 추적합니다." />
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">전체 이벤트</div>
          <div className="stat-value">{counts.all}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">고위험</div>
          <div className="stat-value">{counts.high}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">중위험</div>
          <div className="stat-value">{counts.medium}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">저위험</div>
          <div className="stat-value">{counts.low}</div>
        </div>
      </div>
      <div className="panel">
        <div className="page-actions" style={{ marginBottom: 16 }}>
          <button className={severityFilter === "all" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("all")}>
            전체
          </button>
          <button className={severityFilter === "high" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("high")}>
            고위험
          </button>
          <button className={severityFilter === "medium" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("medium")}>
            중위험
          </button>
          <button className={severityFilter === "low" ? "secondary-button is-active" : "secondary-button"} onClick={() => setSeverityFilter("low")}>
            저위험
          </button>
        </div>
        <SecurityEventTable events={filteredEvents} />
      </div>
    </div>
  );
}
