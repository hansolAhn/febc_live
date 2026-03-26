import { Module } from "@nestjs/common";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { DatabaseModule } from "../database/database.module";
import { DevicesController } from "./devices.controller";
import { DevicesService } from "./devices.service";

@Module({
  imports: [DatabaseModule, AuditLogsModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService]
})
export class DevicesModule {}
