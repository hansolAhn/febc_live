import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AuditActionType } from "../common/enums";
import { InMemoryDataService } from "../database/in-memory-data.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly dataService: InMemoryDataService,
    private readonly auditLogsService: AuditLogsService
  ) {}

  findAll() {
    return this.dataService.getUsers().map((user) => ({
      ...user,
      role: this.dataService.getRoles().find((role) => role.id === user.roleId),
      branch: this.dataService.getBranches().find((branch) => branch.id === user.branchId)
    }));
  }

  findOne(userId: string) {
    const user = this.dataService.findUserById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      ...user,
      role: this.dataService.getRoles().find((role) => role.id === user.roleId),
      branch: this.dataService.getBranches().find((branch) => branch.id === user.branchId),
      devices: this.dataService.getDevicesByUser(user.id)
    };
  }

  updateStatus(userId: string, action: "block" | "restore") {
    const user = this.dataService.updateUserActiveStatus(userId, action === "restore");
    if (!user) {
      throw new NotFoundException("User not found");
    }

    this.auditLogsService.create({
      branchId: user.branchId,
      userId: user.id,
      actionType: action === "block" ? AuditActionType.USER_BLOCKED : AuditActionType.USER_RESTORED,
      payload: {
        username: user.username,
        action
      }
    });

    return {
      ...user,
      role: this.dataService.getRoles().find((role) => role.id === user.roleId),
      branch: this.dataService.getBranches().find((branch) => branch.id === user.branchId)
    };
  }
}
