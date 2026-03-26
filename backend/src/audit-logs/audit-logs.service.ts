import { Injectable } from "@nestjs/common";
import { InMemoryDataService } from "../database/in-memory-data.service";
import { CreateAuditLogDto } from "./dto/create-audit-log.dto";

@Injectable()
export class AuditLogsService {
  constructor(private readonly dataService: InMemoryDataService) {}

  findRecent() {
    return {
      auditLogs: this.dataService.getAuditLogs(),
      loginAttemptLogs: this.dataService.getLoginAttemptLogs()
    };
  }

  create(dto: CreateAuditLogDto) {
    return this.dataService.addAuditLog({
      branchId: dto.branchId,
      userId: dto.userId,
      actionType: dto.actionType as never,
      payload: dto.payload,
      actorIp: dto.actorIp
    });
  }
}
