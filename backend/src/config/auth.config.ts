import { registerAs } from "@nestjs/config";

export default registerAs("auth", () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "replace-with-strong-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "replace-with-strong-secret"
}));
