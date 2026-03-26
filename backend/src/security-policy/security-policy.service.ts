import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuditActionType } from "../common/enums";
import { isIpAllowed } from "../common/utils/ip.util";
import { InMemoryDataService } from "../database/in-memory-data.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { UpdateBranchSecurityPolicyDto } from "./dto/update-branch-security-policy.dto";
import { UpdateUserSecurityPolicyDto } from "./dto/update-user-security-policy.dto";

@Injectable()
export class SecurityPolicyService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataService: InMemoryDataService,
    private readonly auditLogsService: AuditLogsService
  ) {}

  getSystemPolicy() {
    return this.dataService.getSystemSecurityPolicy();
  }

  getBranchPolicy(branchCode: string) {
    const branch = this.dataService.findBranchByCode(branchCode);
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    return {
      branch,
      policy: this.dataService.getBranchSecurityPolicy(branch.id),
      allowedIps: this.dataService.getBranchAllowedIps(branch.id)
    };
  }

  getUserPolicy(userId: string) {
    const user = this.dataService.findUserById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      user,
      policy: this.dataService.getUserSecurityPolicy(user.id),
      allowedIps: this.dataService.getUserAllowedIps(user.id)
    };
  }

  resolvePolicy(branchId: string, userId: string) {
    const systemPolicy = this.dataService.getSystemSecurityPolicy();
    const branchPolicy = this.dataService.getBranchSecurityPolicy(branchId);
    const userPolicy = this.dataService.getUserSecurityPolicy(userId);

    return {
      singleSessionOnly: userPolicy?.singleSessionOnly ?? branchPolicy?.singleSessionOnly ?? systemPolicy.singleSessionOnly,
      otpRequired: userPolicy?.otpRequired ?? branchPolicy?.otpRequired ?? systemPolicy.otpRequired,
      deviceRegistrationRequired:
        userPolicy?.deviceRegistrationRequired ?? branchPolicy?.deviceRegistrationRequired ?? systemPolicy.deviceRegistrationRequired,
      forensicWatermarkEnabled:
        userPolicy?.forensicWatermarkEnabled ?? branchPolicy?.forensicWatermarkEnabled ?? systemPolicy.forensicWatermarkEnabled,
      loginAttemptThreshold: systemPolicy.loginAttemptThreshold
    };
  }

  getAllowedIps(branchId: string, userId: string) {
    const defaultAllowed = this.configService.get<string[]>("security.defaultAllowedIps") ?? [];
    const userAllowed = this.dataService.getUserAllowedIps(userId).map((entry) => entry.cidr);
    if (userAllowed.length > 0) {
      return [...new Set([...defaultAllowed, ...userAllowed])];
    }

    const branchAllowed = this.dataService.getBranchAllowedIps(branchId).map((entry) => entry.cidr);
    return [...new Set([...defaultAllowed, ...branchAllowed])];
  }

  isIpAllowed(ip: string, cidrs: string[]) {
    return isIpAllowed(ip, cidrs);
  }

  updateBranchPolicy(branchCode: string, dto: UpdateBranchSecurityPolicyDto, actor: { userId?: string; actorIp?: string }) {
    const branch = this.dataService.findBranchByCode(branchCode);
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    const updates = Object.fromEntries(
      Object.entries({
        singleSessionOnly: dto.singleSessionOnly,
        otpRequired: dto.otpRequired,
        deviceRegistrationRequired: dto.deviceRegistrationRequired,
        forensicWatermarkEnabled: dto.forensicWatermarkEnabled
      }).filter(([, value]) => value !== undefined)
    );

    const updated = this.dataService.updateBranchSecurityPolicy(branch.id, updates);
    this.auditLogsService.create({
      branchId: branch.id,
      userId: actor.userId,
      actorIp: actor.actorIp,
      actionType: AuditActionType.SECURITY_POLICY_UPDATED,
      payload: { branchCode, changes: dto }
    });

    return updated;
  }

  updateUserPolicy(userId: string, dto: UpdateUserSecurityPolicyDto, actor: { userId?: string; actorIp?: string }) {
    const user = this.dataService.findUserById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updates = Object.fromEntries(
      Object.entries({
        singleSessionOnly: dto.singleSessionOnly,
        otpRequired: dto.otpRequired,
        deviceRegistrationRequired: dto.deviceRegistrationRequired,
        forensicWatermarkEnabled: dto.forensicWatermarkEnabled
      }).filter(([, value]) => value !== undefined)
    );

    const updated = this.dataService.updateUserSecurityPolicy(user.id, updates);
    this.auditLogsService.create({
      branchId: user.branchId,
      userId: actor.userId,
      actorIp: actor.actorIp,
      actionType: AuditActionType.SECURITY_POLICY_UPDATED,
      payload: {
        targetUserId: user.id,
        targetUsername: user.username,
        changes: dto
      }
    });

    return updated;
  }
}
