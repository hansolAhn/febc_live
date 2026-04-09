import type { WatermarkPayload } from "@/lib/mock-api";

const HEX = "0123456789ABCDEF";
const PREAMBLE = "11001010";
const DUPLICATE_COUNT = 3;
const PATCH_COLUMNS = 18;
const PATCH_ROWS = 6;
const PATCH_MARGIN_RATIO = 0.014;
const PATCH_WIDTH_RATIO = 0.13;
const PATCH_HEIGHT_RATIO = 0.06;

type PatchPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

function hashToHex(input: string) {
  let hash = 0x811c9dc5;
  for (const character of input) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function toNibbleBits(character: string) {
  const value = HEX.indexOf(character);
  return value
    .toString(2)
    .padStart(4, "0")
    .split("")
    .map((bit) => Number(bit));
}

function fromNibbleBits(bits: number[]) {
  const value = Number.parseInt(bits.join(""), 2);
  if (Number.isNaN(value) || value < 0 || value > 15) {
    return null;
  }

  return HEX[value];
}

function buildChecksum(token: string) {
  const checksum = token
    .split("")
    .map((character) => HEX.indexOf(character))
    .reduce((accumulator, value) => accumulator ^ value, 0);

  return HEX[checksum & 0xf];
}

function buildPayloadBits(token: string) {
  const normalized = token.toUpperCase().replace(/[^0-9A-F]/g, "").slice(-6).padStart(6, "0");
  const payload = `${normalized}${buildChecksum(normalized)}`;
  return payload.split("").flatMap((character) => toNibbleBits(character));
}

function decodePayloadBits(bits: number[]) {
  if (bits.length % 4 !== 0 || bits.length < 28) {
    return null;
  }

  const characters: string[] = [];
  for (let index = 0; index < bits.length; index += 4) {
    const character = fromNibbleBits(bits.slice(index, index + 4));
    if (!character) {
      return null;
    }
    characters.push(character);
  }

  const payload = characters.join("");
  const token = payload.slice(0, 6);
  const checksum = payload.slice(6, 7);

  if (!token || !checksum) {
    return null;
  }

  return buildChecksum(token) === checksum ? token : null;
}

function buildFramedBits(token: string) {
  const payloadBits = buildPayloadBits(token);
  const frameBits = `${PREAMBLE}${payloadBits.join("")}`
    .split("")
    .map((bit) => Number(bit));

  return Array.from({ length: DUPLICATE_COUNT }, () => frameBits).flat();
}

function reshapeBits(bits: number[]) {
  return bits.map((bit, index) => ({
    bit,
    row: Math.floor(index / PATCH_COLUMNS),
    column: index % PATCH_COLUMNS
  }));
}

function decodeFrames(bits: number[]) {
  const frameLength = PREAMBLE.length + buildPayloadBits("000000").length;
  if (bits.length < frameLength) {
    return null;
  }

  const tokenScores = new Map<string, number>();
  for (let offset = 0; offset <= bits.length - frameLength; offset += 1) {
    const frame = bits.slice(offset, offset + frameLength);
    if (frame.slice(0, PREAMBLE.length).join("") !== PREAMBLE) {
      continue;
    }

    const token = decodePayloadBits(frame.slice(PREAMBLE.length));
    if (token) {
      tokenScores.set(token, (tokenScores.get(token) ?? 0) + 1);
    }
  }

  return [...tokenScores.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle] ?? 0;
}

export function normalizeForensicToken(sessionCode: string) {
  const normalized = sessionCode.toUpperCase().replace(/[^0-9A-F]/g, "");
  if (normalized.length >= 6) {
    return normalized.slice(-6);
  }

  return hashToHex(sessionCode).slice(-6);
}

export function resolveForensicToken(watermark: WatermarkPayload) {
  const config = watermark.hiddenForensicWatermark.hiddenConfig as Record<string, unknown>;
  const candidate = typeof config.forensicToken === "string" ? config.forensicToken.toUpperCase() : null;
  if (candidate && /^[0-9A-F]{6}$/.test(candidate)) {
    return candidate;
  }

  return normalizeForensicToken(watermark.visibleWatermark.sessionCode);
}

export function buildForensicBits(token: string) {
  return reshapeBits(buildFramedBits(token));
}

export function getForensicPatchMetrics(width: number, height: number) {
  const patchWidth = width * PATCH_WIDTH_RATIO;
  const patchHeight = height * PATCH_HEIGHT_RATIO;
  const marginX = width * PATCH_MARGIN_RATIO;
  const marginY = height * PATCH_MARGIN_RATIO;
  const centerX = width / 2 - patchWidth / 2;

  return {
    patchWidth,
    patchHeight,
    cellWidth: patchWidth / PATCH_COLUMNS,
    cellHeight: patchHeight / PATCH_ROWS,
    positions: {
      "top-left": { x: marginX, y: marginY },
      "top-center": { x: centerX, y: marginY },
      "top-right": { x: width - marginX - patchWidth, y: marginY },
      "bottom-left": { x: marginX, y: height - marginY - patchHeight },
      "bottom-center": { x: centerX, y: height - marginY - patchHeight },
      "bottom-right": { x: width - marginX - patchWidth, y: height - marginY - patchHeight }
    } satisfies Record<PatchPosition, { x: number; y: number }>
  };
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const instance = new Image();
      instance.onload = () => resolve(instance);
      instance.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
      instance.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function buildSourceVariants(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const original = context.getImageData(0, 0, width, height);
  const contrast = context.createImageData(width, height);
  const threshold = context.createImageData(width, height);
  const softened = context.createImageData(width, height);
  const coolBoost = context.createImageData(width, height);

  for (let index = 0; index < original.data.length; index += 4) {
    const red = original.data[index];
    const green = original.data[index + 1];
    const blue = original.data[index + 2];
    const alpha = original.data[index + 3];
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;

    contrast.data[index] = Math.max(0, Math.min(255, (red - 128) * 1.45 + 128));
    contrast.data[index + 1] = Math.max(0, Math.min(255, (green - 128) * 1.45 + 128));
    contrast.data[index + 2] = Math.max(0, Math.min(255, (blue - 128) * 1.45 + 128));
    contrast.data[index + 3] = alpha;

    const binary = luminance > 126 ? 255 : 0;
    threshold.data[index] = binary;
    threshold.data[index + 1] = binary;
    threshold.data[index + 2] = binary;
    threshold.data[index + 3] = alpha;

    softened.data[index] = Math.max(0, Math.min(255, red * 0.88 + 18));
    softened.data[index + 1] = Math.max(0, Math.min(255, green * 0.88 + 18));
    softened.data[index + 2] = Math.max(0, Math.min(255, blue * 0.92 + 14));
    softened.data[index + 3] = alpha;

    coolBoost.data[index] = Math.max(0, Math.min(255, red * 0.88));
    coolBoost.data[index + 1] = Math.max(0, Math.min(255, green * 0.92));
    coolBoost.data[index + 2] = Math.max(0, Math.min(255, blue * 1.12 + 10));
    coolBoost.data[index + 3] = alpha;
  }

  return [original.data, contrast.data, threshold.data, softened.data, coolBoost.data];
}

function sampleSignal(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sampleX: number,
  sampleY: number,
  sampleWidth: number,
  sampleHeight: number
) {
  let total = 0;
  let count = 0;

  for (let y = sampleY; y < sampleY + sampleHeight; y += 1) {
    for (let x = sampleX; x < sampleX + sampleWidth; x += 1) {
      const index = (y * sourceWidth + x) * 4;
      const red = source[index];
      const green = source[index + 1];
      const blue = source[index + 2];
      const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
      total += blue * 1.08 - luminance * 0.84 - red * 0.08;
      count += 1;
    }
  }

  return total / Math.max(count, 1);
}

function classifySignals(signals: number[]) {
  const threshold = (median(signals) + average(signals)) / 2;
  const bits = signals.map((signal) => (signal >= threshold ? 1 : 0));
  const confidence = average(signals.map((signal) => Math.min(1, Math.abs(signal - threshold) / 8)));

  return { bits, confidence };
}

function readBitsFromPatch(
  source: Uint8ClampedArray,
  sourceWidth: number,
  startX: number,
  startY: number,
  cellWidth: number,
  cellHeight: number
) {
  const signals: number[] = [];

  for (let row = 0; row < PATCH_ROWS; row += 1) {
    for (let column = 0; column < PATCH_COLUMNS; column += 1) {
      const centerX = startX + column * cellWidth + cellWidth / 2;
      const centerY = startY + row * cellHeight + cellHeight / 2;
      const sampleWidth = Math.max(1, Math.floor(cellWidth * 0.78));
      const sampleHeight = Math.max(1, Math.floor(cellHeight * 0.78));
      const sampleX = Math.max(0, Math.floor(centerX - sampleWidth / 2));
      const sampleY = Math.max(0, Math.floor(centerY - sampleHeight / 2));
      signals.push(sampleSignal(source, sourceWidth, sampleX, sampleY, sampleWidth, sampleHeight));
    }
  }

  const { bits, confidence } = classifySignals(signals);
  return { bits, confidence };
}

export async function extractForensicTokenFromFile(file: File) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("이미지 분석용 캔버스를 준비하지 못했습니다.");
  }

  context.drawImage(image, 0, 0);
  const metrics = getForensicPatchMetrics(canvas.width, canvas.height);
  const variants = buildSourceVariants(context, canvas.width, canvas.height);
  const entries = Object.entries(metrics.positions) as Array<[PatchPosition, { x: number; y: number }]>;

  const tokenCandidates = variants
    .flatMap((variant) =>
      entries.map(([position, point]) => {
        const reading = readBitsFromPatch(variant, canvas.width, point.x, point.y, metrics.cellWidth, metrics.cellHeight);
        const token = decodeFrames(reading.bits);
        return token
          ? {
              token,
              confidence: reading.confidence,
              source: position
            }
          : null;
      })
    )
    .filter((candidate): candidate is { token: string; confidence: number; source: PatchPosition } => Boolean(candidate));

  if (tokenCandidates.length === 0) {
    return null;
  }

  const grouped = new Map<string, { score: number; sources: Set<string> }>();
  tokenCandidates.forEach((candidate) => {
    const current = grouped.get(candidate.token) ?? { score: 0, sources: new Set<string>() };
    current.score += candidate.confidence;
    current.sources.add(candidate.source);
    grouped.set(candidate.token, current);
  });

  const best = [...grouped.entries()].sort((left, right) => right[1].score - left[1].score)[0];
  if (!best) {
    return null;
  }

  return {
    token: best[0],
    confidence: Number(best[1].score.toFixed(2)),
    source: [...best[1].sources].join(", ")
  };
}
