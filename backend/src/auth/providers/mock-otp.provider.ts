import { Injectable, Logger } from "@nestjs/common";
import { OtpProvider, OtpSendPayload } from "../interfaces/otp-provider.interface";

@Injectable()
export class MockOtpProvider implements OtpProvider {
  private readonly logger = new Logger(MockOtpProvider.name);

  async send(payload: OtpSendPayload) {
    this.logger.log(`Mock OTP sent to ${payload.phone}: ${payload.code}`);
  }
}
