"use client";

import * as mockApi from "@/lib/mock-api";

type Props = {
  devices: mockApi.DeviceSummary[];
  busyKey: string;
  onDeviceAction: (deviceId: string, action: "approve" | "block") => Promise<void>;
};

export function DeviceRequestsTab({ devices, busyKey, onDeviceAction }: Props) {
  return (
    <div className="panel">
      <div className="panel-title">승인 대기 기기</div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>소속</th>
              <th>사용자</th>
              <th>기기 이름</th>
              <th>브라우저/OS</th>
              <th>최근 IP</th>
              <th>마지막 감지</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id}>
                <td className="account-table-text-cell">{device.branch}</td>
                <td className="account-table-text-cell">{device.user}</td>
                <td className="account-table-text-cell">{device.label}</td>
                <td className="account-table-text-cell">{device.userAgentSummary}</td>
                <td className="account-table-text-cell">{device.lastIp}</td>
                <td className="account-table-text-cell">{device.lastSeenAt}</td>
                <td>
                  <div className="page-actions">
                    <button
                      className="button secondary"
                      disabled={busyKey === `approve-${device.id}`}
                      onClick={() => void onDeviceAction(device.id, "approve")}
                      type="button"
                    >
                      승인
                    </button>
                    <button
                      className="button ghost"
                      disabled={busyKey === `block-${device.id}`}
                      onClick={() => void onDeviceAction(device.id, "block")}
                      type="button"
                    >
                      차단
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {devices.length === 0 ? (
              <tr>
                <td colSpan={7}>승인 대기 중인 기기가 없습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
