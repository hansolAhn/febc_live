import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { BranchesModule } from "./branches/branches.module";
import { SecurityPolicyModule } from "./security-policy/security-policy.module";
import { SessionsModule } from "./sessions/sessions.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { SecurityEventsModule } from "./security-events/security-events.module";
import { DevicesModule } from "./devices/devices.module";
import { WatermarkModule } from "./watermark/watermark.module";
import { StreamModule } from "./stream/stream.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import appConfig from "./config/app.config";
import authConfig from "./config/auth.config";
import securityConfig from "./config/security.config";
import { DatabaseModule } from "./database/database.module";
import { entities } from "./database/entities";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, securityConfig]
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        url: configService.get<string>("app.databaseUrl"),
        autoLoadEntities: true,
        synchronize: true,
        entities
      })
    }),
    RedisModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    SecurityPolicyModule,
    SessionsModule,
    AuditLogsModule,
    SecurityEventsModule,
    DevicesModule,
    WatermarkModule
    ,
    StreamModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
