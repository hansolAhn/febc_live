import { AuditLog } from "./audit-log.entity";
import { BranchLogoFingerprintProfile } from "./branch-logo-fingerprint-profile.entity";
import { BranchAllowedIp } from "./branch-allowed-ip.entity";
import { BranchSecurityPolicy } from "./branch-security-policy.entity";
import { Branch } from "./branch.entity";
import { Device } from "./device.entity";
import { EventLogoAssignment } from "./event-logo-assignment.entity";
import { LoginAttemptLog } from "./login-attempt-log.entity";
import { Role } from "./role.entity";
import { SecurityEvent } from "./security-event.entity";
import { SystemSecurityPolicy } from "./system-security-policy.entity";
import { UserAllowedIp } from "./user-allowed-ip.entity";
import { UserSecurityPolicy } from "./user-security-policy.entity";
import { UserSession } from "./user-session.entity";
import { User } from "./user.entity";

export const entities = [
  User,
  Branch,
  BranchLogoFingerprintProfile,
  Role,
  SystemSecurityPolicy,
  BranchSecurityPolicy,
  UserSecurityPolicy,
  BranchAllowedIp,
  UserAllowedIp,
  UserSession,
  Device,
  EventLogoAssignment,
  LoginAttemptLog,
  SecurityEvent,
  AuditLog
];
