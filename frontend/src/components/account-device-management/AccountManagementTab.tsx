"use client";

import { FormEvent } from "react";
import * as mockApi from "@/lib/mock-api";
import type { CreateAccountForm } from "./useAccountDeviceManagement";

type Props = {
  users: mockApi.UserSummary[];
  createForm: CreateAccountForm;
  busyKey: string;
  editingPhones: Record<string, string>;
  phoneEditMode: Record<string, boolean>;
  onCreateFormChange: (field: keyof CreateAccountForm, value: string) => void;
  onCreateAccount: () => Promise<void>;
  onResetPassword: (userId: string, username: string) => Promise<void>;
  onUserStatus: (userId: string, action: "block" | "restore") => Promise<void>;
  onRoleChange: (userId: string, nextRoleCode: "SUPER_ADMIN" | "VIEWER") => Promise<void>;
  onPhoneEditStart: (userId: string, currentPhone: string) => void;
  onPhoneDraftChange: (userId: string, phone: string) => void;
  onPhoneSave: (userId: string) => Promise<void>;
};

export function AccountManagementTab({
  users,
  createForm,
  busyKey,
  editingPhones,
  phoneEditMode,
  onCreateFormChange,
  onCreateAccount,
  onResetPassword,
  onUserStatus,
  onRoleChange,
  onPhoneEditStart,
  onPhoneDraftChange,
  onPhoneSave
}: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onCreateAccount();
  }

  return (
    <>
      <form className="panel stack" onSubmit={handleSubmit}>
        <div className="panel-title">새 계정 생성</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div>
            <label className="label" htmlFor="account-branch">소속</label>
            <input
              id="account-branch"
              className="input"
              placeholder="예: 서울본사, 부산지사, 운영팀"
              value={createForm.branchCode}
              onChange={(event) => onCreateFormChange("branchCode", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="account-username">아이디</label>
            <input
              id="account-username"
              className="input"
              value={createForm.username}
              onChange={(event) => onCreateFormChange("username", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="account-password">초기 비밀번호</label>
            <input
              id="account-password"
              className="input"
              value={createForm.password}
              onChange={(event) => onCreateFormChange("password", event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="account-phone">연락처</label>
            <input
              id="account-phone"
              className="input"
              value={createForm.phone}
              onChange={(event) => onCreateFormChange("phone", event.target.value)}
            />
          </div>
        </div>
        <div className="page-actions" style={{ justifyContent: "flex-end" }}>
          <button className="button primary" disabled={busyKey === "create-account"} type="submit">
            {busyKey === "create-account" ? "계정 생성 중.." : "계정 생성"}
          </button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-title">계정 목록</div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>소속</th>
                <th>아이디</th>
                <th>권한</th>
                <th>상태</th>
                <th>관리</th>
                <th>연락처</th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => {
                const isProtected = account.username === "master_admin";

                return (
                  <tr key={account.id}>
                    <td className="account-table-text-cell">{account.branchName}</td>
                    <td className="account-table-text-cell">{account.username}</td>
                    <td>
                      <select
                        className="input"
                        disabled={isProtected || busyKey === `role-${account.id}`}
                        value={account.roleCode === "SUPER_ADMIN" ? "SUPER_ADMIN" : "VIEWER"}
                        onChange={(event) =>
                          void onRoleChange(account.id, event.target.value as "SUPER_ADMIN" | "VIEWER")
                        }
                      >
                        <option value="VIEWER">guest</option>
                        <option value="SUPER_ADMIN">master</option>
                      </select>
                    </td>
                    <td>
                      <div className="account-status-cell">
                        {isProtected ? (
                          <>
                            <span className="account-status-label">{account.isActive ? "사용 가능" : "차단됨"}</span>
                            <button className="button protect account-status-button" disabled type="button">
                              보호
                            </button>
                          </>
                        ) : account.isActive ? (
                          <>
                            <span className="account-status-label">사용 가능</span>
                            <button
                              className="button ghost account-status-button"
                              disabled={busyKey === `block-${account.id}`}
                              onClick={() => void onUserStatus(account.id, "block")}
                              type="button"
                            >
                              차단
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="account-status-label">차단됨</span>
                            <button
                              className="button ghost account-status-button"
                              disabled={busyKey === `restore-${account.id}`}
                              onClick={() => void onUserStatus(account.id, "restore")}
                              type="button"
                            >
                              해제
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="account-manage-cell">
                        <button
                          className="button secondary account-manage-button"
                          disabled={busyKey === `reset-${account.id}`}
                          onClick={() => void onResetPassword(account.id, account.username)}
                          type="button"
                        >
                          {busyKey === `reset-${account.id}` ? "초기화 중.." : "비밀번호 초기화"}
                        </button>
                        <span className="muted account-manage-value">{account.password}</span>
                      </div>
                    </td>
                    <td>
                      <div className="page-actions">
                        <input
                          className="input"
                          disabled={!phoneEditMode[account.id]}
                          style={{ minWidth: 160, flex: "1 1 180px" }}
                          value={editingPhones[account.id] ?? account.phone}
                          onChange={(event) => onPhoneDraftChange(account.id, event.target.value)}
                        />
                        {phoneEditMode[account.id] ? (
                          <button
                            className="button secondary"
                            disabled={busyKey === `phone-${account.id}`}
                            onClick={() => void onPhoneSave(account.id)}
                            type="button"
                          >
                            {busyKey === `phone-${account.id}` ? "저장 중.." : "저장"}
                          </button>
                        ) : (
                          <button
                            className="button secondary"
                            onClick={() => onPhoneEditStart(account.id, account.phone)}
                            type="button"
                          >
                            수정
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
