type Session = {
  id: string;
  branch: string;
  username: string;
  ipAddress: string;
  startedAt: string;
  status: string;
};

export function ActiveSessionTable({ sessions }: { sessions: Session[] }) {
  return (
    <div className="panel">
      <div className="panel-title">현재 접속 세션</div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>지사</th>
              <th>사용자</th>
              <th>IP</th>
              <th>로그인 시각</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.branch}</td>
                <td>{session.username}</td>
                <td>{session.ipAddress}</td>
                <td>{session.startedAt}</td>
                <td>{session.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
