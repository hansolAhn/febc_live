"use client";

import { buildRenderableLogoSvg } from "@/lib/logo-fingerprint";
import type { WatermarkPayload } from "@/lib/mock-api";

export function WatermarkOverlay({
  branchName,
  username,
  watermark
}: {
  branchName: string;
  username: string;
  watermark: WatermarkPayload;
}) {
  const svgTemplate = watermark.visibleWatermark.logoVariantSvgTemplate;
  const sessionCode = watermark.visibleWatermark.sessionCode;
  const logoMarkup = svgTemplate ? buildRenderableLogoSvg(svgTemplate, "/febc_logo.svg") : null;

  return (
    <div className="watermark-overlay" aria-hidden="true">
      <div className="watermark-badge">
        <div className="watermark-logo">
          {logoMarkup ? (
            <div dangerouslySetInnerHTML={{ __html: logoMarkup }} />
          ) : (
            <img src="/febc_logo.svg" alt="" />
          )}
        </div>
        <div className="watermark-meta">
          <span>{branchName}</span>
          <span>{username}</span>
          <span>{sessionCode}</span>
        </div>
      </div>
    </div>
  );
}
