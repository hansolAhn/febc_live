type Session = {
  id: string;
  branch: string;
  username: string;
  deviceLabel: string;
  ipAddress: string;
  startedAt: string;
  lastSeenAt: string;
  sessionKeyTail: string;
  userAgentSummary: string;
  status: string;
};

function isActiveStatus(status: string) {
  return status === "사용 중" || status === "접속 중";
}

export function ActiveSessionTable({
  sessions,
  compact = false,
  title = "현재 접속 세션",
  className = "",
  summary = null
}: {
  sessions: Session[];
  compact?: boolean;
  title?: string;
  className?: string;
  summary?: string | null;
}) {
  return (
    <div className={`panel ${className}`.trim()}>
      <div className="panel-header-inline">
        <div className="panel-title">{title}</div>
        {summary ? <span className="risk-badge risk-low">{summary}</span> : null}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>소속</th>
              <th>아이디</th>
              {compact ? (
                <>
                  <th>IP</th>
                  <th>접속 기기</th>
                  <th className="compact-status-column">상태</th>
                </>
              ) : (
                <>
                  <th>로그인 시각</th>
                  <th>상태</th>
                  <th>기기</th>
                  <th>IP</th>
                  <th>마지막 활동</th>
                  <th>브라우저 / OS</th>
                  <th>세션 코드</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.branch}</td>
                <td>{session.username}</td>
                {compact ? (
                  <>
                    <td>{session.ipAddress}</td>
                    <td>{session.deviceLabel}</td>
                    <td className="compact-status-column">
                      <span
                        className={`status-dot ${isActiveStatus(session.status) ? "status-dot-good" : "status-dot-bad"}`}
                        aria-label={session.status}
                        title={session.status}
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td>{session.startedAt}</td>
                    <td>
                      <span className="table-status">
                        <span className={`status-dot ${isActiveStatus(session.status) ? "status-dot-good" : "status-dot-bad"}`} />
                        {session.status}
                      </span>
                    </td>
                    <td>{session.deviceLabel}</td>
                    <td>{session.ipAddress}</td>
                    <td>{session.lastSeenAt}</td>
                    <td>{session.userAgentSummary}</td>
                    <td>{session.sessionKeyTail}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
