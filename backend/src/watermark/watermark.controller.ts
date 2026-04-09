import { Controller, Get, Param, Query } from "@nestjs/common";
import { FindLeakageCandidatesDto } from "./dto/find-leakage-candidates.dto";
import { WatermarkService } from "./watermark.service";

@Controller("watermarks")
export class WatermarkController {
  constructor(private readonly watermarkService: WatermarkService) {}

  @Get("session/:branchCode/:sessionCode")
  getSessionWatermark(@Param("branchCode") branchCode: string, @Param("sessionCode") sessionCode: string) {
    return this.watermarkService.getSessionWatermark(branchCode, sessionCode);
  }

  @Get("leakage-candidates")
  findLeakageCandidates(@Query() query: FindLeakageCandidatesDto) {
    return this.watermarkService.findLeakageCandidates(query);
  }
}
