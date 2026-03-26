import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { AuditActionType, SecurityEventType, SessionStatus, UserRole } from "../common/enums";

type RoleRecord = { id: string; code: UserRole; name: string };
type BranchRecord = { id: string; code: string; name: string; isActive: boolean };
type UserRecord = {
  id: string;
  branchId: string;
  roleId: string;
  username: string;
  passwordHash: string;
  phone: string;
  isActive: boolean;
};
type BranchLogoProfileRecord = {
  id: string;
  branchCode: string;
  profileVersion: number;
  profileName: string;
  visibleWatermarkConfig: Record<string, unknown>;
  hiddenWatermarkConfig: Record<string, unknown>;
  isActive: boolean;
};
type EventLogoAssignmentRecord = {
  id: string;
  eventCode: string;
  branchCode: string;
  profileId: string;
  sessionCode: string;
  visibleOverlayPayload: Record<string, unknown>;
  hiddenOverlayPayload: Record<string, unknown>;
};

@Injectable()
export class InMemoryDataService {
  private readonly roles: RoleRecord[] = [
    { id: "role-super-admin", code: UserRole.SUPER_ADMIN, name: "Super Admin" },
    { id: "role-branch-admin", code: UserRole.BRANCH_ADMIN, name: "Branch Admin" },
    { id: "role-viewer", code: UserRole.VIEWER, name: "Viewer" }
  ];

  private readonly branches: BranchRecord[] = [
    { id: "branch-seoul", code: "seoul-hq", name: "서울본사", isActive: true },
    { id: "branch-busan", code: "busan", name: "부산지사", isActive: true }
  ];

  private readonly users: UserRecord[] = [
    {
      id: "user-master-1",
      branchId: "branch-seoul",
      roleId: "role-super-admin",
      username: "master_admin",
      passwordHash: "master1234",
      phone: "01099998888",
      isActive: true
    },
    {
      id: "user-1",
      branchId: "branch-seoul",
      roleId: "role-branch-admin",
      username: "branch_admin",
      passwordHash: "pass1234",
      phone: "01012345678",
      isActive: true
    },
    {
      id: "user-2",
      branchId: "branch-busan",
      roleId: "role-viewer",
      username: "busan_viewer",
      passwordHash: "pass1234",
      phone: "01011112222",
      isActive: true
    }
  ];

  private readonly systemSecurityPolicy = {
    id: "system-policy-1",
    singleSessionOnly: true,
    otpRequired: false,
    deviceRegistrationRequired: true,
    forensicWatermarkEnabled: true,
    loginAttemptThreshold: 5
  };

  private readonly branchSecurityPolicies = [
    {
      id: "branch-policy-1",
      branchId: "branch-seoul",
      singleSessionOnly: true,
      otpRequired: true,
      deviceRegistrationRequired: true,
      forensicWatermarkEnabled: true
    }
  ];

  private readonly userSecurityPolicies: Array<{
    id: string;
    userId: string;
    singleSessionOnly?: boolean;
    otpRequired?: boolean;
    deviceRegistrationRequired?: boolean;
    forensicWatermarkEnabled?: boolean;
  }> = [
    {
      id: "user-policy-1",
      userId: "user-1",
      otpRequired: true,
      deviceRegistrationRequired: true
    }
  ];

  private readonly branchAllowedIps = [
    { id: "branch-ip-1", branchId: "branch-seoul", cidr: "10.0.0.0/8", description: "Internal network" },
    { id: "branch-ip-2", branchId: "branch-busan", cidr: "10.0.0.0/8", description: "Internal network" }
  ];

  private readonly userAllowedIps = [
    { id: "user-ip-1", userId: "user-1", cidr: "10.0.0.0/8", description: "HQ operator" }
  ];

  private readonly devices = [
    {
      id: "device-1",
      userId: "user-1",
      branchId: "branch-seoul",
      fingerprintHash: "device-fp-001",
      deviceLabel: "HQ Chrome Windows",
      lastIp: "10.10.1.10",
      isTrusted: true,
      isBlocked: false
    },
    {
      id: "device-2",
      userId: "user-2",
      branchId: "branch-busan",
      fingerprintHash: "device-fp-002",
      deviceLabel: "Busan iPad",
      lastIp: "10.20.1.15",
      isTrusted: false,
      isBlocked: false
    }
  ];

  private readonly branchLogoProfiles: BranchLogoProfileRecord[] = [
    {
      id: "logo-profile-seoul-v1",
      branchCode: "seoul-hq",
      profileVersion: 1,
      profileName: "Seoul HQ FEBC Logo V1",
      visibleWatermarkConfig: {
        logoVariant: "febc-classic-a",
        microShift: "0.8px",
        tint: "#ffffff",
        opacity: 0.92
      },
      hiddenWatermarkConfig: {
        embeddingMode: "metadata-placeholder",
        featureVector: ["ring-gap-a", "crossbar-offset-1"],
        extractorVersion: 1
      },
      isActive: true
    },
    {
      id: "logo-profile-busan-v1",
      branchCode: "busan",
      profileVersion: 1,
      profileName: "Busan FEBC Logo V1",
      visibleWatermarkConfig: {
        logoVariant: "febc-classic-b",
        microShift: "1.1px",
        tint: "#fbfbfb",
        opacity: 0.92
      },
      hiddenWatermarkConfig: {
        embeddingMode: "metadata-placeholder",
        featureVector: ["ring-gap-b", "crossbar-offset-2"],
        extractorVersion: 1
      },
      isActive: true
    }
  ];

  private readonly eventLogoAssignments: EventLogoAssignmentRecord[] = [
    {
      id: "event-logo-assignment-1",
      eventCode: "revival-2026-spring",
      branchCode: "seoul-hq",
      profileId: "logo-profile-seoul-v1",
      sessionCode: "SES-SE-20260317-A1",
      visibleOverlayPayload: {
        position: "top-right",
        showSessionCode: true
      },
      hiddenOverlayPayload: {
        generatorStatus: "pending-real-generator",
        notes: "metadata only in v1"
      }
    }
  ];

  private readonly userSessions: Array<{
    id: string;
    userId: string;
    branchId: string;
    sessionKey: string;
    accessToken: string;
    refreshToken: string;
    ipAddress: string;
    userAgent: string;
    status: SessionStatus;
    lastSeenAt: Date;
  }> = [];

  private readonly loginAttemptLogs: Array<Record<string, unknown>> = [];
  private readonly securityEvents: Array<Record<string, unknown>> = [];
  private readonly auditLogs: Array<Record<string, unknown>> = [];

  getRoles() {
    return this.roles;
  }

  getBranches() {
    return this.branches;
  }

  findBranchByCode(branchCode: string) {
    return this.branches.find((branch) => branch.code === branchCode);
  }

  getUsers() {
    return this.users;
  }

  findUserByUsername(branchId: string, username: string) {
    return this.users.find((user) => user.branchId === branchId && user.username === username);
  }

  findUserById(userId: string) {
    return this.users.find((user) => user.id === userId);
  }

  updateUserActiveStatus(userId: string, isActive: boolean) {
    const user = this.findUserById(userId);
    if (!user) {
      return null;
    }

    user.isActive = isActive;
    return user;
  }

  isSeoulMasterAccount(userId: string) {
    const user = this.findUserById(userId);
    if (!user) {
      return false;
    }

    const role = this.roles.find((item) => item.id === user.roleId);
    const branch = this.branches.find((item) => item.id === user.branchId);

    return role?.code === UserRole.SUPER_ADMIN && branch?.code === "seoul-hq" && user.username === "master_admin";
  }

  getSystemSecurityPolicy() {
    return this.systemSecurityPolicy;
  }

  getBranchSecurityPolicy(branchId: string) {
    return this.branchSecurityPolicies.find((policy) => policy.branchId === branchId);
  }

  getUserSecurityPolicy(userId: string) {
    return this.userSecurityPolicies.find((policy) => policy.userId === userId);
  }

  updateUserSecurityPolicy(userId: string, payload: {
    singleSessionOnly?: boolean;
    otpRequired?: boolean;
    deviceRegistrationRequired?: boolean;
    forensicWatermarkEnabled?: boolean;
  }) {
    const found = this.userSecurityPolicies.find((policy) => policy.userId === userId);
    if (found) {
      Object.assign(found, payload);
      return found;
    }

    const created = {
      id: randomUUID(),
      userId,
      ...payload
    };
    this.userSecurityPolicies.push(created);
    return created;
  }

  updateBranchSecurityPolicy(branchId: string, payload: {
    singleSessionOnly?: boolean;
    otpRequired?: boolean;
    deviceRegistrationRequired?: boolean;
    forensicWatermarkEnabled?: boolean;
  }) {
    const found = this.branchSecurityPolicies.find((policy) => policy.branchId === branchId);
    if (found) {
      Object.assign(found, payload);
      return found;
    }

    const created = {
      id: randomUUID(),
      branchId,
      singleSessionOnly: true,
      otpRequired: false,
      deviceRegistrationRequired: true,
      forensicWatermarkEnabled: true,
      ...payload
    };
    this.branchSecurityPolicies.push(created);
    return created;
  }

  getBranchAllowedIps(branchId: string) {
    return this.branchAllowedIps.filter((entry) => entry.branchId === branchId);
  }

  getUserAllowedIps(userId: string) {
    return this.userAllowedIps.filter((entry) => entry.userId === userId);
  }

  findDeviceByFingerprint(userId: string, fingerprintHash: string) {
    return this.devices.find((device) => device.userId === userId && device.fingerprintHash === fingerprintHash);
  }

  registerOrUpdateDevice(input: {
    userId: string;
    branchId: string;
    fingerprintHash: string;
    deviceLabel: string;
    ipAddress: string;
  }) {
    const existing = this.findDeviceByFingerprint(input.userId, input.fingerprintHash);
    if (existing) {
      existing.lastIp = input.ipAddress;
      existing.deviceLabel = input.deviceLabel || existing.deviceLabel;
      return existing;
    }

    const created = {
      id: randomUUID(),
      userId: input.userId,
      branchId: input.branchId,
      fingerprintHash: input.fingerprintHash,
      deviceLabel: input.deviceLabel,
      lastIp: input.ipAddress,
      isTrusted: false,
      isBlocked: false
    };
    this.devices.push(created);
    return created;
  }

  getDevicesByUser(userId: string) {
    return this.devices.filter((device) => device.userId === userId);
  }

  getDevices() {
    return this.devices;
  }

  findDeviceById(deviceId: string) {
    return this.devices.find((device) => device.id === deviceId);
  }

  updateDeviceApproval(deviceId: string, action: "approve" | "block") {
    const device = this.findDeviceById(deviceId);
    if (!device) {
      return null;
    }

    if (action === "approve") {
      device.isTrusted = true;
      device.isBlocked = false;
    } else {
      device.isTrusted = false;
      device.isBlocked = true;
    }

    return device;
  }

  getBranchLogoProfiles(branchCode?: string) {
    if (!branchCode) {
      return this.branchLogoProfiles;
    }
    return this.branchLogoProfiles.filter((profile) => profile.branchCode === branchCode);
  }

  getActiveBranchLogoProfile(branchCode: string) {
    return this.branchLogoProfiles.find((profile) => profile.branchCode === branchCode && profile.isActive);
  }

  findBranchLogoProfileById(profileId: string) {
    return this.branchLogoProfiles.find((profile) => profile.id === profileId);
  }

  createBranchLogoProfile(input: {
    branchCode: string;
    profileVersion: number;
    profileName: string;
    visibleWatermarkConfig: Record<string, unknown>;
    hiddenWatermarkConfig: Record<string, unknown>;
    isActive: boolean;
  }) {
    const created = { id: randomUUID(), ...input };
    this.branchLogoProfiles.unshift(created);
    return created;
  }

  getEventLogoAssignments(eventCode?: string) {
    if (!eventCode) {
      return this.eventLogoAssignments;
    }
    return this.eventLogoAssignments.filter((assignment) => assignment.eventCode === eventCode);
  }

  assignLogoToEvent(input: {
    id: string;
    eventCode: string;
    branchCode: string;
    profileId: string;
    sessionCode: string;
    visibleOverlayPayload: Record<string, unknown>;
    hiddenOverlayPayload: Record<string, unknown>;
  }) {
    this.eventLogoAssignments.unshift(input);
    return input;
  }

  getUserSessions() {
    return this.userSessions;
  }

  findSessionByAccessToken(accessToken: string) {
    return this.userSessions.find((session) => session.accessToken === accessToken && session.status === SessionStatus.ACTIVE);
  }

  terminateActiveSessionsByBranch(branchId: string) {
    for (const session of this.userSessions.filter((entry) => entry.branchId === branchId && entry.status === SessionStatus.ACTIVE)) {
      session.status = SessionStatus.TERMINATED;
    }
  }

  createSession(input: {
    userId: string;
    branchId: string;
    accessToken: string;
    refreshToken: string;
    ipAddress: string;
    userAgent: string;
  }) {
    const session = {
      id: randomUUID(),
      userId: input.userId,
      branchId: input.branchId,
      sessionKey: randomUUID(),
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: SessionStatus.ACTIVE,
      lastSeenAt: new Date()
    };
    this.userSessions.push(session);
    return session;
  }

  addLoginAttemptLog(log: Record<string, unknown>) {
    const record = { id: randomUUID(), createdAt: new Date(), ...log };
    this.loginAttemptLogs.unshift(record);
    return record;
  }

  getLoginAttemptLogs() {
    return this.loginAttemptLogs;
  }

  addSecurityEvent(log: {
    branchId?: string;
    userId?: string;
    eventType: SecurityEventType;
    severity: string;
    detail: Record<string, unknown>;
  }) {
    const record = { id: randomUUID(), isResolved: false, createdAt: new Date(), ...log };
    this.securityEvents.unshift(record);
    return record;
  }

  getSecurityEvents() {
    return this.securityEvents;
  }

  addAuditLog(log: {
    branchId?: string;
    userId?: string;
    actionType: AuditActionType;
    payload: Record<string, unknown>;
    actorIp?: string;
  }) {
    const record = { id: randomUUID(), createdAt: new Date(), ...log };
    this.auditLogs.unshift(record);
    return record;
  }

  getAuditLogs() {
    return this.auditLogs;
  }
}
