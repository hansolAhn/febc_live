import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { AssignEventLogoDto } from "./dto/assign-event-logo.dto";
import { CreateBranchLogoProfileDto } from "./dto/create-branch-logo-profile.dto";
import { FindLeakageCandidatesDto } from "./dto/find-leakage-candidates.dto";
import { IdentifyLogoCaptureDto } from "./dto/identify-logo-capture.dto";
import { WatermarkService } from "./watermark.service";

@Controller("watermarks")
export class WatermarkController {
  constructor(private readonly watermarkService: WatermarkService) {}

  @Get("profiles")
  getProfiles(@Query("branchCode") branchCode?: string) {
    return this.watermarkService.getBranchProfiles(branchCode);
  }

  @Post("profiles")
  createProfile(@Body() dto: CreateBranchLogoProfileDto) {
    return this.watermarkService.createBranchProfile(dto);
  }

  @Get("assignments")
  getAssignments(@Query("eventCode") eventCode?: string) {
    return this.watermarkService.getEventAssignments(eventCode);
  }

  @Post("assignments")
  assignLogo(@Body() dto: AssignEventLogoDto) {
    return this.watermarkService.assignLogoToEvent(dto);
  }

  @Get("session/:branchCode/:sessionCode")
  getSessionWatermark(@Param("branchCode") branchCode: string, @Param("sessionCode") sessionCode: string) {
    return this.watermarkService.getSessionWatermark(branchCode, sessionCode);
  }

  @Post("identify-capture")
  identifyCapture(@Body() dto: IdentifyLogoCaptureDto) {
    return this.watermarkService.identifyBranchFromCapture(dto);
  }

  @Get("leakage-candidates")
  findLeakageCandidates(@Query() query: FindLeakageCandidatesDto) {
    return this.watermarkService.findLeakageCandidates(query);
  }
}
