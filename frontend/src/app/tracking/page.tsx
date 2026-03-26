"use client";

import { useEffect, useState } from "react";
import { ActiveSessionTable } from "@/components/ActiveSessionTable";
import { DeviceList } from "@/components/DeviceList";
import { PageHeader } from "@/components/PageHeader";
import * as mockApi from "@/lib/mock-api";

export default function TrackingPage() {
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof mockApi.fetchSessions>>>([]);
  const [devices, setDevices] = useState<Awaited<ReturnType<typeof mockApi.fetchDevices>>>([]);
  const [error, setError] = useState("");
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);

  async function loadData() {
    const [sessionData, deviceData] = await Promise.all([mockApi.fetchSessions(), mockApi.fetchDevices()]);
    setSessions(sessionData);
    setDevices(deviceData);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function approveDevice(deviceId: string) {
    setBusyDeviceId(deviceId);
    setError("");
    try {
      await mockApi.approveDevice(deviceId);
      await loadData();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "기기 승인을 완료하지 못했습니다.");
    } finally {
      setBusyDeviceId(null);
    }
  }

  async function blockDevice(deviceId: string) {
    setBusyDeviceId(deviceId);
    setError("");
    try {
      await mockApi.blockDevice(deviceId);
      await loadData();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "기기 차단을 완료하지 못했습니다.");
    } finally {
      setBusyDeviceId(null);
    }
  }

  return (
    <div className="page-wrap">
      <PageHeader
        title="사용자 / 기기 추적"
        subtitle="현재 접속 중인 사용자와 등록 기기를 함께 확인하고 승인 또는 차단할 수 있습니다."
      />
      {error ? <div className="panel">{error}</div> : null}
      <div className="grid">
        <ActiveSessionTable sessions={sessions} />
        <DeviceList busyDeviceId={busyDeviceId} devices={devices} onApprove={approveDevice} onBlock={blockDevice} />
      </div>
    </div>
  );
}
