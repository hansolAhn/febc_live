import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OtpService } from "./otp.service";
import { MockOtpProvider } from "./providers/mock-otp.provider";
import { SessionsModule } from "../sessions/sessions.module";
import { SecurityPolicyModule } from "../security-policy/security-policy.module";
import { SecurityEventsModule } from "../security-events/security-events.module";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { WatermarkModule } from "../watermark/watermark.module";

@Module({
  imports: [SessionsModule, SecurityPolicyModule, SecurityEventsModule, AuditLogsModule, WatermarkModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    MockOtpProvider,
    {
      provide: "OTP_PROVIDER",
      useExisting: MockOtpProvider
    }
  ],
  exports: [AuthService]
})
export class AuthModule {}
