import { WatermarkPayload } from "@/lib/mock-api";

function buildSeed(input: string) {
  return Array.from(input).reduce((accumulator, character, index) => {
    return accumulator + character.charCodeAt(0) * (index + 17);
  }, 0);
}

function buildOverlayNodes(branchName: string, username: string, watermark: WatermarkPayload) {
  const seed = buildSeed(`${branchName}-${username}-${watermark.visibleWatermark.sessionCode}-${watermark.profileVersion}`);
  const shift = Number.parseFloat(String(watermark.visibleWatermark.microShift).replace("px", "")) || 0;
  const sessionTail = watermark.visibleWatermark.sessionCode.slice(-6);
  const profileLabel = `v${watermark.profileVersion}`;
  const baseLines = [
    `FEBC ${branchName}`,
    `${username} ${sessionTail}`,
    `${watermark.visibleWatermark.logoVariant} ${profileLabel}`
  ];

  return Array.from({ length: 9 }, (_, index) => {
    const x = 8 + ((seed + index * 19) % 78);
    const y = 10 + ((seed + index * 23) % 72);
    const rotate = -17 + ((seed + index * 7) % 9);
    const opacity = 0.03 + ((seed + index * 13) % 4) * 0.009;
    const fontSize = 9 + ((seed + index * 5) % 3);
    const letterSpacing = 0.22 + ((seed + index) % 3) * 0.05;
    const line = baseLines[index % baseLines.length];
    const animationDelay = `${((seed + index * 11) % 9) * -1.4}s`;
    const animationDuration = `${28 + ((seed + index * 17) % 16)}s`;

    return {
      key: `${line}-${index}`,
      text: line,
      style: {
        left: `${Math.min(x + shift, 88)}%`,
        top: `${Math.min(y + shift, 86)}%`,
        opacity,
        fontSize: `${fontSize}px`,
        letterSpacing: `${letterSpacing}em`,
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        animationDelay,
        animationDuration
      }
    };
  });
}

export function WatermarkOverlay({
  branchName,
  username,
  watermark
}: {
  branchName: string;
  username: string;
  watermark: WatermarkPayload;
}) {
  const nodes = buildOverlayNodes(branchName, username, watermark);
  const sessionTail = watermark.visibleWatermark.sessionCode.slice(-8);

  return (
    <div className="watermark-overlay" aria-hidden="true">
      <div className="watermark-grid">
        {nodes.map((node) => (
          <div key={node.key} className="watermark-node" style={node.style}>
            {node.text}
          </div>
        ))}
      </div>
      <div className="watermark-edge watermark-edge-top">
        FEBC {branchName} {sessionTail}
      </div>
      <div className="watermark-edge watermark-edge-right">
        {watermark.visibleWatermark.logoVariant} {sessionTail}
      </div>
      <div className="watermark-edge watermark-edge-bottom">
        {username} {watermark.visibleWatermark.logoVariant} {sessionTail}
      </div>
    </div>
  );
}
