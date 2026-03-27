import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Request } from "express";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AuditActionType, SecurityEventType } from "../common/enums";
import { AuthenticationException } from "../common/exceptions/authentication.exception";
import { PolicyViolationException } from "../common/exceptions/policy-violation.exception";
import { InMemoryDataService } from "../database/in-memory-data.service";
import { SecurityEventsService } from "../security-events/security-events.service";
import { SecurityPolicyService } from "../security-policy/security-policy.service";
import { SessionsService } from "../sessions/sessions.service";
import { WatermarkService } from "../watermark/watermark.service";
import { LoginDto } from "./dto/login.dto";
import { RequestLoginOtpDto } from "./dto/request-login-otp.dto";
import { OtpService } from "./otp.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly dataService: InMemoryDataService,
    private readonly otpService: OtpService,
    private readonly sessionsService: SessionsService,
    private readonly securityPolicyService: SecurityPolicyService,
    private readonly securityEventsService: SecurityEventsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly watermarkService: WatermarkService
  ) {}

  async login(dto: LoginDto, request: Request) {
    const ipAddress = this.extractIp(request);
    const userAgent = request.headers["user-agent"] ?? "unknown";
    const deviceSystemName = this.summarizeUserAgent(String(userAgent));
    const branch = this.dataService.findBranchByCode(dto.branchCode);

    if (!branch) {
      this.dataService.addLoginAttemptLog({ username: dto.username, attemptIp: ipAddress, succeeded: false, failureReason: "BRANCH_NOT_FOUND" });
      this.securityEventsService.create({
        eventType: SecurityEventType.LOGIN_FAILURE,
        severity: "low",
        detail: { reason: "BRANCH_NOT_FOUND", username: dto.username, ipAddress }
      });
      throw new AuthenticationException("Invalid branch or user");
    }

    const user = this.dataService.findUserByUsername(branch.id, dto.username);
    if (!user || user.passwordHash !== dto.password) {
      this.dataService.addLoginAttemptLog({ branchId: branch.id, username: dto.username, attemptIp: ipAddress, succeeded: false, failureReason: "INVALID_CREDENTIALS" });
      this.securityEventsService.create({
        branchId: branch.id,
        userId: user?.id,
        eventType: SecurityEventType.LOGIN_FAILURE,
        severity: "low",
        detail: { reason: "INVALID_CREDENTIALS", username: dto.username, ipAddress }
      });
      throw new AuthenticationException("Invalid branch or user");
    }

    if (!user.isActive) {
      this.dataService.addLoginAttemptLog({
        branchId: branch.id,
        userId: user.id,
        username: dto.username,
        attemptIp: ipAddress,
        succeeded: false,
        failureReason: "ACCOUNT_BLOCKED"
      });
      this.securityEventsService.create({
        branchId: branch.id,
        userId: user.id,
        eventType: SecurityEventType.LOGIN_FAILURE,
        severity: "high",
        detail: { reason: "ACCOUNT_BLOCKED", username: dto.username, ipAddress }
      });
      throw new PolicyViolationException("차단된 계정입니다. 최고 관리자에게 문의하세요.");
    }

    const resolvedPolicy = this.securityPolicyService.resolvePolicy(branch.id, user.id);
    const allowedIps = this.securityPolicyService.getAllowedIps(branch.id, user.id);

    if (allowedIps.length > 0 && !this.securityPolicyService.isIpAllowed(ipAddress, allowedIps)) {
      this.dataService.addLoginAttemptLog({ branchId: branch.id, userId: user.id, username: dto.username, attemptIp: ipAddress, succeeded: false, failureReason: "DISALLOWED_IP" });
      this.securityEventsService.create({
        branchId: branch.id,
        userId: user.id,
        eventType: SecurityEventType.DISALLOWED_IP,
        severity: "high",
        detail: { ipAddress, username: dto.username }
      });
      throw new PolicyViolationException("IP is not allowed by policy");
    }

    if (resolvedPolicy.otpRequired) {
      const verified = await this.otpService.verifyLoginOtp(user.phone, dto.otpCode);
      if (!verified) {
        this.dataService.addLoginAttemptLog({ branchId: branch.id, userId: user.id, username: dto.username, attemptIp: ipAddress, succeeded: false, failureReason: "OTP_REQUIRED_OR_INVALID" });
        this.securityEventsService.create({
          branchId: branch.id,
          userId: user.id,
          eventType: SecurityEventType.OTP_FAILURE,
          severity: "medium",
          detail: { reason: "OTP_REQUIRED_OR_INVALID", username: dto.username, ipAddress }
        });
        throw new PolicyViolationException("OTP verification required");
      }
    }

    const device = this.dataService.registerOrUpdateDevice({
      userId: user.id,
      branchId: branch.id,
      fingerprintHash: dto.deviceFingerprint,
      deviceLabel: dto.deviceLabel,
      ipAddress,
      userAgent: String(userAgent),
      systemName: deviceSystemName
    });
    const isMasterAccount = this.dataService.isSeoulMasterAccount(user.id);

    if (device.isBlocked) {
      this.securityEventsService.create({
        branchId: branch.id,
        userId: user.id,
        eventType: SecurityEventType.BLOCKED_DEVICE_LOGIN,
        severity: "high",
        detail: { deviceFingerprint: dto.deviceFingerprint, deviceLabel: dto.deviceLabel, ipAddress }
      });
      throw new PolicyViolationException("차단된 기기입니다. 관리자에게 문의하세요.");
    }

    if (isMasterAccount && !device.isTrusted) {
      this.dataService.updateDeviceApproval(device.id, "approve");
      device.isTrusted = true;
      device.isBlocked = false;
    }

    if (resolvedPolicy.deviceRegistrationRequired && !device.isTrusted && !isMasterAccount) {
      this.securityEventsService.create({
        branchId: branch.id,
        userId: user.id,
        eventType: SecurityEventType.DEVICE_NOT_REGISTERED,
        severity: "medium",
        detail: { deviceFingerprint: dto.deviceFingerprint, deviceLabel: dto.deviceLabel }
      });
      throw new PolicyViolationException("등록되지 않은 기기입니다. 관리자 승인 후 로그인할 수 있습니다.");
    }

    if (resolvedPolicy.singleSessionOnly) {
      const activeSessions = await this.sessionsService.findActiveSessionsByUser(user.id);

      if (activeSessions.length > 0 && !isMasterAccount) {
        const hasDifferentNetwork = activeSessions.some((session) => session.ipAddress !== ipAddress);
        if (dto.forceLogin) {
          await this.sessionsService.enforceSingleSession(branch.id, user.id);
          this.securityEventsService.create({
            branchId: branch.id,
            userId: user.id,
            eventType: SecurityEventType.SESSION_TAKEOVER,
            severity: hasDifferentNetwork ? "medium" : "low",
            detail: {
              takeoverMode: "USER_CONFIRMED_FORCE_LOGIN",
              activeSessionCount: activeSessions.length,
              username: user.username,
              hasDifferentNetwork
            }
          });
        } else {
          this.securityEventsService.create({
            branchId: branch.id,
            userId: user.id,
            eventType: SecurityEventType.CONCURRENT_SESSION_BLOCKED,
            severity: "medium",
            detail: {
              blockedByExistingSession: true,
              activeSessionCount: activeSessions.length,
              username: user.username
            }
          });

          throw new PolicyViolationException("이미 이 지사 계정으로 로그인 중입니다. 기존 세션을 종료한 후 다시 시도하세요.");
        }
      }

      if (activeSessions.length > 0 && isMasterAccount) {
        const hasDifferentNetwork = activeSessions.some((session) => session.ipAddress !== ipAddress);
        await this.sessionsService.enforceSingleSession(branch.id, user.id);
        this.securityEventsService.create({
          branchId: branch.id,
          userId: user.id,
          eventType: SecurityEventType.SESSION_TAKEOVER,
          severity: hasDifferentNetwork ? "high" : "medium",
          detail: {
            takeoverMode: "MASTER_OVERRIDE",
            activeSessionCount: activeSessions.length,
            username: user.username,
            hasDifferentNetwork
          }
        });
      }
    }

    const accessToken = `mvp-access-${randomUUID()}`;
    const refreshToken = `mvp-refresh-${randomUUID()}`;
    const session = await this.sessionsService.create({
      userId: user.id,
      branchId: branch.id,
      deviceId: device.id,
      deviceLabel: device.deviceLabel,
      accessToken,
      refreshToken,
      ipAddress,
      userAgent: String(userAgent)
    });

    this.dataService.addLoginAttemptLog({ branchId: branch.id, userId: user.id, username: dto.username, attemptIp: ipAddress, succeeded: true });
    this.auditLogsService.create({
      branchId: branch.id,
      userId: user.id,
      actionType: AuditActionType.LOGIN_SUCCESS,
      actorIp: ipAddress,
      payload: { username: user.username, sessionKey: session.sessionKey }
    });

    return {
      accessToken,
      refreshToken,
      sessionKey: session.sessionKey,
      branch: { id: branch.id, code: branch.code, name: branch.name },
      user: {
        id: user.id,
        username: user.username,
        roleCode: this.dataService.getRoles().find((role) => role.id === user.roleId)?.code ?? "VIEWER"
      },
      effectivePolicy: resolvedPolicy,
      watermark: this.watermarkService.getSessionWatermark(branch.code, session.sessionKey)
    };
  }

  async requestLoginOtp(dto: RequestLoginOtpDto, request: Request) {
    const ipAddress = this.extractIp(request);
    const branch = this.dataService.findBranchByCode(dto.branchCode);

    if (!branch) {
      throw new AuthenticationException("Invalid branch or user");
    }

    const user = this.dataService.findUserByUsername(branch.id, dto.username);
    if (!user || user.passwordHash !== dto.password) {
      throw new AuthenticationException("Invalid branch or user");
    }

    const allowedIps = this.securityPolicyService.getAllowedIps(branch.id, user.id);
    if (allowedIps.length > 0 && !this.securityPolicyService.isIpAllowed(ipAddress, allowedIps)) {
      throw new PolicyViolationException("IP is not allowed by policy");
    }

    const result = await this.otpService.sendLoginOtp(user.phone);
    this.auditLogsService.create({
      branchId: branch.id,
      userId: user.id,
      actorIp: ipAddress,
      actionType: AuditActionType.OTP_SENT,
      payload: { username: user.username, purpose: "LOGIN" }
    });

    return {
      ...result,
      message: "문자 OTP를 발송했습니다. 테스트 환경에서는 123456을 입력하면 됩니다."
    };
  }

  async getCurrentUser(request: Request) {
    const token = this.extractBearerToken(request);
    const session = await this.sessionsService.findByAccessToken(token);
    if (!session) {
      throw new AuthenticationException("Session not found");
    }

    const user = this.dataService.findUserById(session.userId);
    if (!user) {
      throw new AuthenticationException("User not found");
    }

    const branch = this.dataService.getBranches().find((item) => item.id === session.branchId);
    const role = this.dataService.getRoles().find((item) => item.id === user.roleId);

    return {
      id: user.id,
      username: user.username,
      phone: user.phone,
      branch,
      role,
      session: {
        sessionKey: session.sessionKey,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        status: session.status
      },
      devices: this.dataService.getDevicesByUser(user.id),
      watermark: this.watermarkService.getSessionWatermark(branch?.code ?? "unknown", session.sessionKey)
    };
  }

  async logout(request: Request) {
    const token = this.extractBearerToken(request);
    const session = await this.sessionsService.terminateByAccessToken(token);

    if (!session) {
      throw new AuthenticationException("Session not found");
    }

    this.auditLogsService.create({
      branchId: session.branchId,
      userId: session.userId,
      actorIp: session.ipAddress,
      actionType: AuditActionType.LOGOUT,
      payload: { reason: "LOGOUT", sessionKey: session.sessionKey }
    });

    return {
      success: true,
      sessionKey: session.sessionKey
    };
  }

  private extractBearerToken(request: Request) {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new AuthenticationException("Bearer token required");
    }

    return authorization.replace("Bearer ", "").trim();
  }

  private extractIp(request: Request) {
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0].trim();
    }

    return request.ip || "127.0.0.1";
  }

  private summarizeUserAgent(userAgent: string) {
    const normalized = userAgent.toLowerCase();
    const browser = normalized.includes("edg/")
      ? "Edge"
      : normalized.includes("chrome/")
        ? "Chrome"
        : normalized.includes("safari/") && !normalized.includes("chrome/")
          ? "Safari"
          : normalized.includes("firefox/")
            ? "Firefox"
            : "Browser";

    const os = normalized.includes("windows")
      ? "Windows"
      : normalized.includes("android")
        ? "Android"
        : normalized.includes("iphone") || normalized.includes("ipad")
          ? "iOS"
          : normalized.includes("mac os")
            ? "macOS"
            : "OS";

    return `${browser} ${os} 자동 감지`;
  }
}
