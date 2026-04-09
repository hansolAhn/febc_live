"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AccountManagementTab } from "@/components/account-device-management/AccountManagementTab";
import { DeviceRequestsTab } from "@/components/account-device-management/DeviceRequestsTab";
import { RegisteredDevicesTab } from "@/components/account-device-management/RegisteredDevicesTab";
import {
  useAccountDeviceManagement
} from "@/components/account-device-management/useAccountDeviceManagement";
import { useAuth } from "@/components/providers/AuthProvider";

type TabKey = "accounts" | "requests" | "devices";

export default function AccountDeviceManagementPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("accounts");
  const {
    users,
    pendingDevices,
    managedDevices,
    createForm,
    setCreateForm,
    editingPhones,
    phoneEditMode,
    error,
    successMessage,
    busyKey,
    setError,
    setSuccessMessage,
    clearFeedback,
    loadAll,
    handleCreateAccount,
    handleResetPassword,
    handleUserStatus,
    handleRoleChange,
    startPhoneEdit,
    setPhoneDraft,
    handlePhoneSave,
    handleDeviceAction
  } = useAccountDeviceManagement();

  function changeTab(nextTab: TabKey) {
    setActiveTab(nextTab);
    clearFeedback();
    router.replace(`/account-device-management?tab=${nextTab}`);
  }

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.roleCode !== "SUPER_ADMIN") {
      router.replace("/");
      return;
    }

    void loadAll().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "계정/기기 정보를 불러오지 못했습니다.");
    });
  }, [isAuthLoading, loadAll, router, setError, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "accounts" || tab === "requests" || tab === "devices") {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (!successMessage && !error) return;

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
      setError(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [error, setError, setSuccessMessage, successMessage]);

  if (isAuthLoading || !user) {
    return <div className="login-shell"><div className="panel">권한을 확인하는 중입니다...</div></div>;
  }

  const headerActions = successMessage ? (
    <div className="inline-toast inline-toast-success">{successMessage}</div>
  ) : error ? (
    <div className="inline-toast inline-toast-error">{error}</div>
  ) : null;

  return (
    <div className="page-wrap">
      <PageHeader title="계정/기기 관리" actions={headerActions} />

      <div className="tab-bar">
        <button className={activeTab === "accounts" ? "secondary-button is-active" : "secondary-button"} onClick={() => changeTab("accounts")} type="button">
          계정 관리
        </button>
        <button className={activeTab === "requests" ? "secondary-button is-active" : "secondary-button"} onClick={() => changeTab("requests")} type="button">
          기기 등록 요청
        </button>
        <button className={activeTab === "devices" ? "secondary-button is-active" : "secondary-button"} onClick={() => changeTab("devices")} type="button">
          등록 기기 관리
        </button>
      </div>

      {activeTab === "accounts" ? (
        <AccountManagementTab
          users={users}
          createForm={createForm}
          busyKey={busyKey}
          editingPhones={editingPhones}
          phoneEditMode={phoneEditMode}
          onCreateFormChange={(field, value) =>
            setCreateForm((current) => ({
              ...current,
              [field]: value
            }))
          }
          onCreateAccount={handleCreateAccount}
          onResetPassword={handleResetPassword}
          onUserStatus={handleUserStatus}
          onRoleChange={handleRoleChange}
          onPhoneEditStart={startPhoneEdit}
          onPhoneDraftChange={setPhoneDraft}
          onPhoneSave={handlePhoneSave}
        />
      ) : null}

      {activeTab === "requests" ? (
        <DeviceRequestsTab
          devices={pendingDevices}
          busyKey={busyKey}
          onDeviceAction={(deviceId, action) => handleDeviceAction(deviceId, action)}
        />
      ) : null}

      {activeTab === "devices" ? (
        <RegisteredDevicesTab
          devices={managedDevices}
          busyKey={busyKey}
          onDeviceAction={(deviceId, action) => handleDeviceAction(deviceId, action)}
        />
      ) : null}
    </div>
  );
}
