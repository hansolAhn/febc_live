import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OtpProvider } from "./interfaces/otp-provider.interface";

@Injectable()
export class OtpService {
  private readonly lastSentMap = new Map<string, number>();
  private readonly cooldownSeconds = 30;
  private readonly expiresInSeconds = 180;

  constructor(
    private readonly configService: ConfigService,
    @Inject("OTP_PROVIDER") private readonly otpProvider: OtpProvider
  ) {}

  async sendLoginOtp(phone: string) {
    const now = Date.now();
    const lastSentAt = this.lastSentMap.get(phone);

    if (lastSentAt) {
      const elapsedSeconds = Math.floor((now - lastSentAt) / 1000);
      const remainingSeconds = this.cooldownSeconds - elapsedSeconds;

      if (remainingSeconds > 0) {
        throw new BadRequestException(`OTP는 ${remainingSeconds}초 후 다시 요청할 수 있습니다.`);
      }
    }

    const expectedCode = this.configService.get<string>("security.otpMockCode") ?? "123456";
    await this.otpProvider.send({ phone, code: expectedCode, purpose: "LOGIN" });
    this.lastSentMap.set(phone, now);

    return {
      sent: true,
      expiresInSeconds: this.expiresInSeconds,
      cooldownSeconds: this.cooldownSeconds
    };
  }

  async verifyLoginOtp(phone: string, otpCode?: string) {
    const expectedCode = this.configService.get<string>("security.otpMockCode");

    // TODO: 실제 SMS provider 연동 및 OTP 발급/저장/만료/재시도 제한 저장소를 연결
    if (!otpCode) {
      await this.sendLoginOtp(phone);
      return false;
    }

    return otpCode === expectedCode;
  }
}
