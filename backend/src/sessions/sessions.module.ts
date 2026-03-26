import { Module, forwardRef } from "@nestjs/common";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { SecurityEventsModule } from "../security-events/security-events.module";

@Module({
  imports: [forwardRef(() => AuditLogsModule), forwardRef(() => SecurityEventsModule)],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService]
})
export class SessionsModule {}
