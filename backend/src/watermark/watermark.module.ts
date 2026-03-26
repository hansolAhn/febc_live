import { Module } from "@nestjs/common";
import { SessionsModule } from "../sessions/sessions.module";
import { WatermarkController } from "./watermark.controller";
import { WatermarkService } from "./watermark.service";
import { PlaceholderLogoAnalysisService } from "./providers/placeholder-logo-analysis.service";

@Module({
  imports: [SessionsModule],
  controllers: [WatermarkController],
  providers: [
    WatermarkService,
    PlaceholderLogoAnalysisService,
    {
      provide: "LOGO_ANALYSIS_SERVICE",
      useExisting: PlaceholderLogoAnalysisService
    }
  ],
  exports: [WatermarkService]
})
export class WatermarkModule {}
