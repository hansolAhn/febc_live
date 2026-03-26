import { registerAs } from "@nestjs/config";

export default registerAs("security", () => ({
  defaultAllowedIps: (process.env.DEFAULT_ALLOWED_IPS ?? "127.0.0.1/32,10.0.0.0/8")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  otpProvider: process.env.OTP_PROVIDER ?? "mock",
  otpMockCode: process.env.OTP_MOCK_CODE ?? "123456"
}));
