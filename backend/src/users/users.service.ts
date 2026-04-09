import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AuditActionType, UserRole } from "../common/enums";
import { InMemoryDataService } from "../database/in-memory-data.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

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

  create(dto: CreateUserDto) {
    const normalizedBranchCode = dto.branchCode.trim();
    if (!normalizedBranchCode) {
      throw new BadRequestException("소속을 입력해 주세요.");
    }

    const normalizedPhone = dto.phone.trim();
    if (!normalizedPhone) {
      throw new BadRequestException("연락처를 입력해 주세요.");
    }

    const branch =
      this.dataService.findBranchByCode(normalizedBranchCode) ??
      this.dataService.createBranch({
        code: normalizedBranchCode,
        name: normalizedBranchCode
      });

    const role = this.dataService.getRoles().find((item) => item.code === (dto.roleCode as UserRole));
    if (!role) {
      throw new BadRequestException("권한 정보를 찾을 수 없습니다.");
    }

    if (this.dataService.findUserByUsernameGlobal(dto.username)) {
      throw new BadRequestException("이미 존재하는 아이디입니다.");
    }

    const user = this.dataService.createUser({
      branchId: branch.id,
      roleId: role.id,
      username: dto.username,
      passwordHash: dto.password,
      phone: normalizedPhone,
      isActive: dto.isActive ?? true
    });

    this.auditLogsService.create({
      branchId: branch.id,
      userId: user.id,
      actionType: AuditActionType.USER_CREATED,
      payload: {
        username: user.username,
        roleCode: role.code
      }
    });

    return {
      ...user,
      role,
      branch
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

  resetPassword(userId: string, password: string) {
    const user = this.dataService.updateUserPassword(userId, password);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    this.auditLogsService.create({
      branchId: user.branchId,
      userId: user.id,
      actionType: AuditActionType.USER_PASSWORD_RESET,
      payload: {
        username: user.username
      }
    });

    return {
      success: true,
      userId: user.id,
      username: user.username,
      temporaryPassword: password
    };
  }

  updateProfile(userId: string, dto: UpdateUserDto) {
    const currentUser = this.dataService.findUserById(userId);
    if (!currentUser) {
      throw new NotFoundException("User not found");
    }

    if (this.dataService.isSeoulMasterAccount(userId) && dto.roleCode && dto.roleCode !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException("Protected user role cannot be changed");
    }

    const nextRole =
      dto.roleCode !== undefined
        ? this.dataService.getRoles().find((item) => item.code === (dto.roleCode as UserRole))
        : this.dataService.getRoles().find((item) => item.id === currentUser.roleId);

    if (!nextRole) {
      throw new BadRequestException("Role not found");
    }

    const updated = this.dataService.updateUserProfile(userId, {
      roleId: nextRole.id,
      phone: dto.phone?.trim() ?? currentUser.phone
    });

    if (!updated) {
      throw new NotFoundException("User not found");
    }

    this.auditLogsService.create({
      branchId: updated.branchId,
      userId: updated.id,
      actionType: AuditActionType.USER_UPDATED,
      payload: {
        username: updated.username,
        roleCode: nextRole.code,
        phone: updated.phone
      }
    });

    return {
      ...updated,
      role: nextRole,
      branch: this.dataService.getBranches().find((branch) => branch.id === updated.branchId)
    };
  }
}
