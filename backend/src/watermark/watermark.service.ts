import { Injectable } from "@nestjs/common";
import { InMemoryDataService } from "../database/in-memory-data.service";
import { SessionsService } from "../sessions/sessions.service";
import { FindLeakageCandidatesDto } from "./dto/find-leakage-candidates.dto";
import { buildLogoFingerprintMeta, LogoVariantProfile } from "./logo-fingerprint.util";

@Injectable()
export class WatermarkService {
  constructor(
    private readonly dataService: InMemoryDataService,
    private readonly sessionsService: SessionsService
  ) {}

  private normalizeForensicToken(sessionCode: string) {
    const normalized = sessionCode.toUpperCase().replace(/[^0-9A-F]/g, "");
    if (normalized.length >= 6) {
      return normalized.slice(-6);
    }

    let hash = 0x811c9dc5;
    for (const character of sessionCode) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).toUpperCase().padStart(6, "0").slice(-6);
  }

  private resolveFallbackProfile(branchCode: string) {
    return {
      id: `fallback-profile-${branchCode}`,
      profileVersion: 1,
      visibleWatermarkConfig: {
        logoVariant: "default",
        microShift: "0.0px",
        tint: "#ffffff"
      },
      hiddenWatermarkConfig: {
        strategy: "session-default"
      }
    };
  }

  getSessionWatermark(
    branchCode: string,
    sessionCode: string,
    options?: {
      deviceId?: string | null;
      deviceFingerprintHash?: string | null;
      deviceLabel?: string | null;
      logoVariantProfile?: LogoVariantProfile | null;
      logoVariantSvgTemplate?: string | null;
    }
  ) {
    const profile = this.dataService.getActiveBranchLogoProfile(branchCode) ?? this.resolveFallbackProfile(branchCode);

    const deviceSeed = options?.deviceFingerprintHash ?? options?.deviceId ?? sessionCode;
    const logoFingerprint = buildLogoFingerprintMeta(branchCode, deviceSeed, sessionCode);
    const logoVariantProfile = options?.logoVariantProfile ?? logoFingerprint.profile;
    const logoVariantSvgTemplate = options?.logoVariantSvgTemplate ?? logoFingerprint.asset.svgTemplate;

    return {
      branchCode,
      sessionCode,
      profileId: profile.id,
      profileVersion: profile.profileVersion,
      visibleWatermark: {
        logoVariant: profile.visibleWatermarkConfig["logoVariant"] ?? "default",
        microShift: profile.visibleWatermarkConfig["microShift"] ?? "0.0px",
        tint: profile.visibleWatermarkConfig["tint"] ?? "#ffffff",
        sessionCode,
        logoFingerprintCode: logoFingerprint.code,
        badgeVersion: "logo-template-v2",
        deviceLabel: options?.deviceLabel ?? "등록 기기",
        sessionAssistCode: logoVariantProfile.sessionAssistCode,
        logoVariantProfile,
        logoVariantSvgTemplate
      },
      hiddenForensicWatermark: {
        strategy: "logo-template-v2",
        profileVersion: profile.profileVersion,
        hiddenConfig: {
          ...profile.hiddenWatermarkConfig,
          forensicToken: logoFingerprint.code,
          sessionToken: this.normalizeForensicToken(sessionCode),
          sessionAssistCode: logoVariantProfile.sessionAssistCode,
          extractorVersion: 5,
          embeddingMode: "logo-template-v2"
        }
      }
    };
  }

  async findLeakageCandidates(query: FindLeakageCandidatesDto) {
    const sessions = await this.sessionsService.findAll();
    const auditLogs = this.dataService.getAuditLogs();
    const securityEvents = this.dataService.getSecurityEvents();
    const selectedActionType = query.auditActionType?.trim() || null;

    const candidates = sessions
      .filter((session) => {
        if (query.branchCode && session.branchCode !== query.branchCode) {
          return false;
        }

        if (query.username && session.username !== query.username) {
          return false;
        }

        if (query.deviceId && session.deviceId !== query.deviceId) {
          return false;
        }

        if (query.sessionCodeFragment && !session.sessionKey.includes(query.sessionCodeFragment)) {
          return false;
        }

        const candidateAuditLogs = auditLogs.filter((log) => log.userId === session.userId && log.branchId === session.branchId);
        if (selectedActionType && !candidateAuditLogs.some((log) => log.actionType === selectedActionType)) {
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
          query.sessionCodeFragment ? "세션 선택" : null,
          query.branchCode ? "지사 선택" : null,
          query.username ? "사용자 선택" : null,
          query.deviceId ? "기기 선택" : null,
          selectedActionType ? "행동 선택" : null
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
          watermark: this.getSessionWatermark(session.branchCode, session.sessionKey, {
            deviceId: session.deviceId,
            deviceLabel: session.deviceLabel
          }),
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
          deviceId: query.deviceId ?? null,
          username: query.username ?? null,
          auditActionType: query.auditActionType ?? null
        }
      },
      candidates
    };
  }
}
