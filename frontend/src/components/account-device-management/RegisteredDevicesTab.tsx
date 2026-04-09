"use client";

import * as mockApi from "@/lib/mock-api";

type Props = {
  devices: mockApi.DeviceSummary[];
  busyKey: string;
  onDeviceAction: (deviceId: string, action: "block" | "restore") => Promise<void>;
};

export function RegisteredDevicesTab({ devices, busyKey, onDeviceAction }: Props) {
  return (
    <div className="panel">
      <div className="panel-title">등록 기기 목록</div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>소속</th>
              <th>사용자</th>
              <th>기기 이름</th>
              <th>상태</th>
              <th>최근 IP</th>
              <th>최근 승인</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id}>
                <td className="account-table-text-cell">{device.branch}</td>
                <td className="account-table-text-cell">{device.user}</td>
                <td className="account-table-text-cell">{device.label}</td>
                <td className="account-table-text-cell">{device.statusLabel}</td>
                <td className="account-table-text-cell">{device.lastIp}</td>
                <td className="account-table-text-cell">{device.approvalUpdatedAt}</td>
                <td>
                  <div className="device-manage-cell">
                    {!device.blocked ? (
                      <button
                        className="button ghost device-manage-button"
                        disabled={busyKey === `block-${device.id}`}
                        onClick={() => void onDeviceAction(device.id, "block")}
                        type="button"
                      >
                        차단
                      </button>
                    ) : (
                      <button
                        className="button secondary device-manage-button"
                        disabled={busyKey === `restore-${device.id}`}
                        onClick={() => void onDeviceAction(device.id, "restore")}
                        type="button"
                      >
                        해제
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {devices.length === 0 ? (
              <tr>
                <td colSpan={7}>등록된 기기가 없습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
