"use client";

import { useCallback, useMemo, useState } from "react";
import * as mockApi from "@/lib/mock-api";

export type CreateAccountForm = {
  branchCode: string;
  username: string;
  roleCode: "VIEWER";
  password: string;
  phone: string;
};

export const initialCreateForm: CreateAccountForm = {
  branchCode: "",
  username: "",
  roleCode: "VIEWER",
  password: "",
  phone: ""
};

export function useAccountDeviceManagement() {
  const [users, setUsers] = useState<mockApi.UserSummary[]>([]);
  const [devices, setDevices] = useState<mockApi.DeviceSummary[]>([]);
  const [createForm, setCreateForm] = useState<CreateAccountForm>(initialCreateForm);
  const [editingPhones, setEditingPhones] = useState<Record<string, string>>({});
  const [phoneEditMode, setPhoneEditMode] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const pendingDevices = useMemo(() => devices.filter((device) => !device.trusted && !device.blocked), [devices]);
  const managedDevices = useMemo(() => devices.filter((device) => device.trusted || device.blocked), [devices]);

  function clearFeedback() {
    setError(null);
    setSuccessMessage("");
  }

  const loadAll = useCallback(async () => {
    const [nextUsers, nextDevices] = await Promise.all([mockApi.fetchUsers(), mockApi.fetchDevices()]);

    setUsers(nextUsers);
    setDevices(nextDevices);
    setEditingPhones(Object.fromEntries(nextUsers.map((account) => [account.id, account.phone])));
  }, []);

  async function handleCreateAccount() {
    setBusyKey("create-account");
    clearFeedback();

    try {
      const organization = createForm.branchCode.trim();
      const username = createForm.username.trim();
      const password = createForm.password.trim();
      const phone = createForm.phone.trim();

      if (!organization) {
        throw new Error("소속을 입력해 주세요.");
      }
      if (!username) {
        throw new Error("아이디를 입력해 주세요.");
      }
      if (!password) {
        throw new Error("초기 비밀번호를 입력해 주세요.");
      }
      if (!phone) {
        throw new Error("연락처를 입력해 주세요.");
      }

      await mockApi.createUserAccount({
        ...createForm,
        branchCode: organization,
        username,
        password,
        phone
      });
      setSuccessMessage(`${username} 계정을 생성했습니다. 소속: ${organization}`);
      setCreateForm(initialCreateForm);
      await loadAll();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "계정 생성에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  }

  async function handleResetPassword(userId: string, username: string) {
    const temporaryPassword = `temp${Math.random().toString(36).slice(2, 8)}!`;
    setBusyKey(`reset-${userId}`);
    clearFeedback();

    try {
      await mockApi.resetUserPassword(userId, temporaryPassword);
      setSuccessMessage(`${username} 비밀번호를 초기화했습니다.`);
      await loadAll();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "비밀번호 초기화에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  }

  async function handleUserStatus(userId: string, action: "block" | "restore") {
    setBusyKey(`${action}-${userId}`);
    clearFeedback();

    try {
      const targetUser = users.find((account) => account.id === userId);

      if (action === "block") {
        await mockApi.blockUser(userId);
        setSuccessMessage(`${targetUser?.username ?? "계정"}을 차단했습니다.`);
      } else {
        await mockApi.restoreUser(userId);
        setSuccessMessage(`${targetUser?.username ?? "계정"} 차단을 해제했습니다.`);
      }

      await loadAll();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "계정 상태 변경에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  }

  async function handleRoleChange(userId: string, nextRoleCode: "SUPER_ADMIN" | "VIEWER") {
    setBusyKey(`role-${userId}`);
    clearFeedback();

    try {
      await mockApi.updateUserAccount(userId, { roleCode: nextRoleCode });
      setSuccessMessage(`권한을 ${nextRoleCode === "SUPER_ADMIN" ? "master" : "guest"}로 변경했습니다.`);
      await loadAll();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "권한 변경에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  }

  function startPhoneEdit(userId: string, currentPhone: string) {
    setEditingPhones((current) => ({ ...current, [userId]: currentPhone }));
    setPhoneEditMode((current) => ({ ...current, [userId]: true }));
  }

  function setPhoneDraft(userId: string, phone: string) {
    setEditingPhones((current) => ({ ...current, [userId]: phone }));
  }

  async function handlePhoneSave(userId: string) {
    setBusyKey(`phone-${userId}`);
    clearFeedback();

    try {
      await mockApi.updateUserAccount(userId, { phone: editingPhones[userId] ?? "" });
      setSuccessMessage("연락처를 수정했습니다.");
      setPhoneEditMode((current) => ({ ...current, [userId]: false }));
      await loadAll();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "연락처 수정에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  }

  async function handleDeviceAction(deviceId: string, action: "approve" | "block" | "restore") {
    setBusyKey(`${action}-${deviceId}`);
    clearFeedback();

    try {
      const targetDevice = devices.find((device) => device.id === deviceId);

      if (action === "approve") {
        await mockApi.approveDevice(deviceId);
        setSuccessMessage(`${targetDevice?.label ?? "기기"}를 승인했습니다.`);
      } else if (action === "block") {
        await mockApi.blockDevice(deviceId);
        setSuccessMessage(`${targetDevice?.label ?? "기기"}를 차단했습니다.`);
      } else {
        await mockApi.restoreDevice(deviceId);
        setSuccessMessage(`${targetDevice?.label ?? "기기"} 차단을 해제했습니다.`);
      }

      await loadAll();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "기기 상태 변경에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  }

  return {
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
  };
}
