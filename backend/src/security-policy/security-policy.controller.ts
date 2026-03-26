import { Body, Controller, Get, Param, Patch, Req } from "@nestjs/common";
import { Request } from "express";
import { SecurityPolicyService } from "./security-policy.service";
import { UpdateBranchSecurityPolicyDto } from "./dto/update-branch-security-policy.dto";
import { UpdateUserSecurityPolicyDto } from "./dto/update-user-security-policy.dto";

@Controller("security-policy")
export class SecurityPolicyController {
  constructor(private readonly securityPolicyService: SecurityPolicyService) {}

  @Get("system")
  getSystemPolicy() {
    return this.securityPolicyService.getSystemPolicy();
  }

  @Get("branches/:branchCode")
  getBranchPolicy(@Param("branchCode") branchCode: string) {
    return this.securityPolicyService.getBranchPolicy(branchCode);
  }

  @Get("users/:userId")
  getUserPolicy(@Param("userId") userId: string) {
    return this.securityPolicyService.getUserPolicy(userId);
  }

  @Patch("branches/:branchCode")
  updateBranchPolicy(
    @Param("branchCode") branchCode: string,
    @Body() dto: UpdateBranchSecurityPolicyDto,
    @Req() request: Request
  ) {
    return this.securityPolicyService.updateBranchPolicy(branchCode, dto, {
      actorIp: request.ip
    });
  }

  @Patch("users/:userId")
  updateUserPolicy(
    @Param("userId") userId: string,
    @Body() dto: UpdateUserSecurityPolicyDto,
    @Req() request: Request
  ) {
    return this.securityPolicyService.updateUserPolicy(userId, dto, {
      actorIp: request.ip
    });
  }
}
