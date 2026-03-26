import { Module, forwardRef } from "@nestjs/common";
import { SecurityPolicyController } from "./security-policy.controller";
import { SecurityPolicyService } from "./security-policy.service";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";

@Module({
  imports: [forwardRef(() => AuditLogsModule)],
  controllers: [SecurityPolicyController],
  providers: [SecurityPolicyService],
  exports: [SecurityPolicyService]
})
export class SecurityPolicyModule {}
