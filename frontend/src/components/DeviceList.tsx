type Device = {
  id: string;
  branch: string;
  user: string;
  label: string;
  fingerprint: string;
  trusted: boolean;
  blocked: boolean;
  statusLabel: string;
  lastIp: string;
};

export function DeviceList({
  devices,
  onApprove,
  onBlock,
  busyDeviceId
}: {
  devices: Device[];
  onApprove?: (deviceId: string) => void;
  onBlock?: (deviceId: string) => void;
  busyDeviceId?: string | null;
}) {
  return (
    <div className="panel">
      <div className="panel-title">등록 기기 관리</div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>지사</th>
              <th>사용자</th>
              <th>기기 이름</th>
              <th>기기 식별값</th>
              <th>상태</th>
              <th>마지막 접속 IP</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => {
              const isBusy = busyDeviceId === device.id;
              const showApprove = !device.trusted;
              const showBlock = !device.blocked;

              return (
                <tr key={device.id}>
                  <td>{device.branch}</td>
                  <td>{device.user}</td>
                  <td>{device.label}</td>
                  <td>{device.fingerprint}</td>
                  <td>{device.statusLabel}</td>
                  <td>{device.lastIp}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {showApprove ? (
                        <button className="button secondary" disabled={isBusy} onClick={() => onApprove?.(device.id)} type="button">
                          승인
                        </button>
                      ) : null}
                      {showBlock ? (
                        <button className="button ghost" disabled={isBusy} onClick={() => onBlock?.(device.id)} type="button">
                          차단
                        </button>
                      ) : null}
                      {!showApprove && !showBlock ? <span style={{ color: "var(--color-text-muted)" }}>추가 조치 없음</span> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
