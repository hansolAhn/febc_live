type SecurityEvent = {
  id: string;
  createdAt: string;
  severity: string;
  type: string;
  typeLabel: string;
  branch: string;
  branchLabel: string;
  detail: string;
};

function severityClass(severity: string) {
  if (severity === "high") return "risk-badge risk-high";
  if (severity === "medium") return "risk-badge risk-medium";
  return "risk-badge risk-low";
}

function severityLabel(severity: string) {
  if (severity === "high") return "높음";
  if (severity === "medium") return "보통";
  return "낮음";
}

export function SecurityEventTable({ events }: { events: SecurityEvent[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>시각</th>
            <th>위험도</th>
            <th>이벤트</th>
            <th>지사</th>
            <th>상세 설명</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={5}>아직 기록된 보안 이벤트가 없습니다.</td>
            </tr>
          ) : null}
          {events.map((event) => (
            <tr key={event.id}>
              <td>{event.createdAt}</td>
              <td>
                <span className={severityClass(event.severity)}>{severityLabel(event.severity)}</span>
              </td>
              <td>{event.typeLabel}</td>
              <td>{event.branchLabel}</td>
              <td>{event.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
