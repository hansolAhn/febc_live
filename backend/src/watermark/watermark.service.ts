import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { InMemoryDataService } from "../database/in-memory-data.service";
import { SessionsService } from "../sessions/sessions.service";
import { CreateBranchLogoProfileDto } from "./dto/create-branch-logo-profile.dto";
import { AssignEventLogoDto } from "./dto/assign-event-logo.dto";
import { FindLeakageCandidatesDto } from "./dto/find-leakage-candidates.dto";
import { IdentifyLogoCaptureDto } from "./dto/identify-logo-capture.dto";
import { LogoAnalysisService } from "./interfaces/logo-analysis-service.interface";

@Injectable()
export class WatermarkService {
  constructor(
    private readonly dataService: InMemoryDataService,
    private readonly sessionsService: SessionsService,
    @Inject("LOGO_ANALYSIS_SERVICE") private readonly logoAnalysisService: LogoAnalysisService
  ) {}

  getBranchProfiles(branchCode?: string) {
    return this.dataService.getBranchLogoProfiles(branchCode);
  }

  createBranchProfile(dto: CreateBranchLogoProfileDto) {
    return this.dataService.createBranchLogoProfile(dto);
  }

  getEventAssignments(eventCode?: string) {
    return this.dataService.getEventLogoAssignments(eventCode);
  }

  assignLogoToEvent(dto: AssignEventLogoDto) {
    const profile = this.dataService.findBranchLogoProfileById(dto.profileId);
    if (!profile) {
      throw new NotFoundException("Logo fingerprint profile not found");
    }

    return this.dataService.assignLogoToEvent({
      id: randomUUID(),
      ...dto
    });
  }

  getSessionWatermark(branchCode: string, sessionCode: string) {
    const profile = this.dataService.getActiveBranchLogoProfile(branchCode);
    if (!profile) {
      throw new NotFoundException("Active logo fingerprint profile not found");
    }

    return {
      branchCode,
      sessionCode,
      profileId: profile.id,
      profileVersion: profile.profileVersion,
      visibleWatermark: {
        logoVariant: profile.visibleWatermarkConfig["logoVariant"] ?? "default",
        microShift: profile.visibleWatermarkConfig["microShift"] ?? "0.0px",
        tint: profile.visibleWatermarkConfig["tint"] ?? "#ffffff",
        sessionCode
      },
      hiddenForensicWatermark: {
        strategy: "profile-metadata-only",
        profileVersion: profile.profileVersion,
        hiddenConfig: profile.hiddenWatermarkConfig,
        // TODO: attach actual pixel-domain / frequency-domain forensic watermark generator output
      }
    };
  }

  identifyBranchFromCapture(dto: IdentifyLogoCaptureDto) {
    return this.logoAnalysisService.identifyBranchFromCapturedLogo({
      capturedImageRef: dto.capturedImageRef,
      extractedHints: dto.extractedHints
    });
  }

  async findLeakageCandidates(query: FindLeakageCandidatesDto) {
    const sessions = await this.sessionsService.findAll();
    const fromTime = query.observedAtFrom ? new Date(query.observedAtFrom).getTime() : null;
    const toTime = query.observedAtTo ? new Date(query.observedAtTo).getTime() : null;
    const auditLogs = this.dataService.getAuditLogs();
    const securityEvents = this.dataService.getSecurityEvents();

    const candidates = sessions
      .filter((session) => {
        if (query.branchCode && session.branchCode !== query.branchCode) {
          return false;
        }

        if (query.username && !session.username.toLowerCase().includes(query.username.toLowerCase())) {
          return false;
        }

        if (query.sessionCodeFragment && !session.sessionKey.toLowerCase().includes(query.sessionCodeFragment.toLowerCase())) {
          return false;
        }

        const startedAt = new Date(session.startedAt).getTime();
        if (fromTime && startedAt < fromTime) {
          return false;
        }

        if (toTime && startedAt > toTime) {
          return false;
        }

        return true;
      })
      .map((session) => {
        const candidateAuditLogs = auditLogs
          .filter((log) => log.userId === session.userId && log.branchId === session.branchId)
          .slice(0, 5)
          .map((log) => ({
            createdAt: log.createdAt,
            actionType: log.actionType,
            payload: log.payload
          }));

        const candidateSecurityEvents = securityEvents
          .filter((event) => event.userId === session.userId && event.branchId === session.branchId)
          .slice(0, 5)
          .map((event) => ({
            createdAt: event.createdAt,
            eventType: event.eventType,
            severity: event.severity,
            detail: event.detail
          }));

        const matchedBy = [
          query.sessionCodeFragment ? "세션 코드 조각" : null,
          query.branchCode ? "지사" : null,
          query.username ? "사용자명" : null,
          query.observedAtFrom || query.observedAtTo ? "시각 범위" : null
        ].filter((value): value is string => Boolean(value));

        return {
          id: session.id,
          userId: session.userId,
          deviceId: session.deviceId ?? null,
          deviceLabel: session.deviceLabel ?? null,
          branchCode: session.branchCode,
          branchName: session.branchName,
          username: session.username,
          sessionKey: session.sessionKey,
          sessionCodeTail: session.sessionKey.slice(-8),
          startedAt: session.startedAt,
          status: session.status,
          ipAddress: session.ipAddress,
          matchedBy,
          watermark: this.getSessionWatermark(session.branchCode, session.sessionKey),
          recentAuditLogs: candidateAuditLogs,
          recentSecurityEvents: candidateSecurityEvents,
          confidenceScore: matchedBy.length
        };
      })
      .sort((left, right) => right.confidenceScore - left.confidenceScore || String(right.startedAt).localeCompare(String(left.startedAt)));

    return {
      summary: {
        totalCandidates: candidates.length,
        searchedBy: {
          sessionCodeFragment: query.sessionCodeFragment ?? null,
          branchCode: query.branchCode ?? null,
          username: query.username ?? null,
          observedAtFrom: query.observedAtFrom ?? null,
          observedAtTo: query.observedAtTo ?? null
        }
      },
      candidates
    };
  }
}
