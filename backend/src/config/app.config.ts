import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://febc_live:change_me@postgres:5432/febc_live"
}));
