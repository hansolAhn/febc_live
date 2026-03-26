import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateAuditLogDto } from "./dto/create-audit-log.dto";
import { AuditLogsService } from "./audit-logs.service";

@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findRecent() {
    return this.auditLogsService.findRecent();
  }

  @Post()
  create(@Body() dto: CreateAuditLogDto) {
    return this.auditLogsService.create(dto);
  }
}
