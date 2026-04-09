import { Module } from "@nestjs/common";
import { SessionsModule } from "../sessions/sessions.module";
import { WatermarkController } from "./watermark.controller";
import { WatermarkService } from "./watermark.service";

@Module({
  imports: [SessionsModule],
  controllers: [WatermarkController],
  providers: [WatermarkService],
  exports: [WatermarkService]
})
export class WatermarkModule {}
