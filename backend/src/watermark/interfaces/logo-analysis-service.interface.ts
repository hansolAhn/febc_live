export interface LogoAnalysisService {
  identifyBranchFromCapturedLogo(input: {
    capturedImageRef: string;
    extractedHints: Record<string, unknown>;
  }): Promise<{
    matched: boolean;
    branchCode?: string;
    profileVersion?: number;
    confidence?: number;
    notes: string;
  }>;
}
