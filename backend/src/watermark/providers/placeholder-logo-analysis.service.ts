import { Injectable } from "@nestjs/common";
import { LogoAnalysisService } from "../interfaces/logo-analysis-service.interface";

@Injectable()
export class PlaceholderLogoAnalysisService implements LogoAnalysisService {
  async identifyBranchFromCapturedLogo(input: {
    capturedImageRef: string;
    extractedHints: Record<string, unknown>;
  }) {
    return {
      matched: false,
      notes: `TODO: connect forensic image analysis pipeline for ${input.capturedImageRef}`,
      confidence: 0
    };
  }
}
