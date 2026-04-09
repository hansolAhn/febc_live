export const ORIGINAL_LOGO_SIZE = {
  width: 340,
  height: 78
} as const;

export const LOGO_BADGE_LAYOUT = {
  widthRatio: 0.18,
  rightRatio: 0.03,
  topRatio: 0.032,
  aspectRatio: ORIGINAL_LOGO_SIZE.width / ORIGINAL_LOGO_SIZE.height
} as const;

type LogoCandidate = {
  code: string;
  svgTemplate: string;
};

type MatchResult = {
  code: string;
  score: number;
  scoreGap: number;
};

const MATCH_SIZE = {
  width: 320,
  height: 96
} as const;

const LOGO_SRC_PLACEHOLDER = "__FEBC_LOGO_SRC__";
const LETTER_RECTS = {
  f: { x1: 0.0, x2: 0.12, y1: 0.08, y2: 0.92 },
  e: { x1: 0.12, x2: 0.23, y1: 0.08, y2: 0.92 },
  b: { x1: 0.22, x2: 0.34, y1: 0.08, y2: 0.92 },
  c: { x1: 0.33, x2: 0.46, y1: 0.08, y2: 0.92 }
} as const;

export function buildRenderableLogoSvg(svgTemplate: string, logoSrc?: string) {
  const resolvedSrc =
    logoSrc ??
    (typeof window !== "undefined" ? `${window.location.origin}/febc_logo.png` : "/febc_logo.png");

  return svgTemplate.replaceAll(LOGO_SRC_PLACEHOLDER, resolvedSrc);
}

function readImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("업로드한 이미지를 불러오지 못했습니다."));
    };
    image.src = objectUrl;
  });
}

function readImageFromSvgTemplate(svgTemplate: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const blob = new Blob([buildRenderableLogoSvg(svgTemplate)], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("저장된 로고 자산을 렌더링하지 못했습니다."));
    };
    image.src = objectUrl;
  });
}

function getBadgeRect(width: number, height: number) {
  const badgeWidth = width * LOGO_BADGE_LAYOUT.widthRatio;
  const badgeHeight = badgeWidth / LOGO_BADGE_LAYOUT.aspectRatio;
  const badgeLeft = width * (1 - LOGO_BADGE_LAYOUT.rightRatio) - badgeWidth;
  const badgeTop = height * LOGO_BADGE_LAYOUT.topRatio;

  return {
    left: badgeLeft,
    top: badgeTop,
    width: badgeWidth,
    height: badgeHeight
  };
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = MATCH_SIZE.width;
  canvas.height = MATCH_SIZE.height;
  return canvas;
}

function toGrayscale(data: Uint8ClampedArray, width: number, height: number) {
  const gray = new Float32Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const source = index * 4;
    gray[index] = data[source] * 0.2126 + data[source + 1] * 0.7152 + data[source + 2] * 0.0722;
  }
  return gray;
}

function normalize(values: Float32Array) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 0.001) {
    return values;
  }

  const normalized = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    normalized[index] = (values[index] - min) / (max - min);
  }
  return normalized;
}

function computeEdgeMap(gray: Float32Array, width: number, height: number) {
  const edges = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const gx =
        -gray[index - width - 1] -
        2 * gray[index - 1] -
        gray[index + width - 1] +
        gray[index - width + 1] +
        2 * gray[index + 1] +
        gray[index + width + 1];
      const gy =
        -gray[index - width - 1] -
        2 * gray[index - width] -
        gray[index - width + 1] +
        gray[index + width - 1] +
        2 * gray[index + width] +
        gray[index + width + 1];
      edges[index] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return normalize(edges);
}

function getBinaryMask(gray: Float32Array) {
  const mask = new Uint8Array(gray.length);
  for (let index = 0; index < gray.length; index += 1) {
    mask[index] = gray[index] > 0.6 ? 1 : 0;
  }
  return mask;
}

function createProfileFromContext(context: CanvasRenderingContext2D) {
  const imageData = context.getImageData(0, 0, MATCH_SIZE.width, MATCH_SIZE.height);
  const gray = normalize(toGrayscale(imageData.data, MATCH_SIZE.width, MATCH_SIZE.height));
  const edges = computeEdgeMap(gray, MATCH_SIZE.width, MATCH_SIZE.height);
  const mask = getBinaryMask(gray);
  return { gray, edges, mask };
}

function renderTemplateProfile(image: HTMLImageElement) {
  const canvas = createCanvas();
  const context = canvas.getContext("2d");
  if (!context) throw new Error("템플릿 캔버스를 만들지 못했습니다.");

  context.clearRect(0, 0, MATCH_SIZE.width, MATCH_SIZE.height);
  context.drawImage(image, 0, 0, MATCH_SIZE.width, MATCH_SIZE.height);
  return createProfileFromContext(context);
}

function sampleCaptureProfiles(sourceImage: HTMLImageElement) {
  const rect = getBadgeRect(sourceImage.width, sourceImage.height);
  const variants = [
    { leftOffset: 0, topOffset: 0, widthScale: 1, heightScale: 1 },
    { leftOffset: -0.015, topOffset: 0, widthScale: 1.03, heightScale: 1.03 },
    { leftOffset: 0.015, topOffset: 0, widthScale: 1.03, heightScale: 1.03 },
    { leftOffset: 0, topOffset: -0.015, widthScale: 1.03, heightScale: 1.03 },
    { leftOffset: 0, topOffset: 0.01, widthScale: 0.97, heightScale: 0.97 },
    { leftOffset: -0.01, topOffset: -0.01, widthScale: 1.05, heightScale: 1.05 }
  ];

  return variants.map((variant) => {
    const canvas = createCanvas();
    const context = canvas.getContext("2d");
    if (!context) throw new Error("캡처 분석 캔버스를 만들지 못했습니다.");

    context.drawImage(
      sourceImage,
      rect.left + rect.width * variant.leftOffset,
      rect.top + rect.height * variant.topOffset,
      rect.width * variant.widthScale,
      rect.height * variant.heightScale,
      0,
      0,
      MATCH_SIZE.width,
      MATCH_SIZE.height
    );

    return createProfileFromContext(context);
  });
}

function compareProfiles(
  capture: { gray: Float32Array; edges: Float32Array },
  template: { gray: Float32Array; edges: Float32Array; mask: Uint8Array }
) {
  const zoneWeights = {
    f: 0.28,
    e: 0.24,
    b: 0.24,
    c: 0.24
  } as const;

  let total = 0;

  for (const [key, weight] of Object.entries(zoneWeights) as Array<[keyof typeof zoneWeights, number]>) {
    const rect = LETTER_RECTS[key];
    const xStart = Math.floor(MATCH_SIZE.width * rect.x1);
    const xEnd = Math.floor(MATCH_SIZE.width * rect.x2);
    const yStart = Math.floor(MATCH_SIZE.height * rect.y1);
    const yEnd = Math.floor(MATCH_SIZE.height * rect.y2);

    let edgeDiff = 0;
    let grayDiff = 0;
    let count = 0;

    for (let y = yStart; y < yEnd; y += 1) {
      for (let x = xStart; x < xEnd; x += 1) {
        const index = y * MATCH_SIZE.width + x;
        if (template.mask[index] === 0) continue;
        edgeDiff += Math.abs(capture.edges[index] - template.edges[index]);
        grayDiff += Math.abs(capture.gray[index] - template.gray[index]);
        count += 1;
      }
    }

    if (count === 0) {
      return Number.POSITIVE_INFINITY;
    }

    const zoneScore = (edgeDiff / count) * 0.76 + (grayDiff / count) * 0.24;
    total += zoneScore * weight;
  }

  return total;
}

export async function matchLogoFingerprintFromFile(file: File, candidates: LogoCandidate[]): Promise<MatchResult | null> {
  const normalizedCandidates = candidates.filter((candidate) => candidate.code && candidate.svgTemplate);
  if (normalizedCandidates.length === 0) {
    return null;
  }

  const captureImage = await readImageFromFile(file);
  const captureProfiles = sampleCaptureProfiles(captureImage);
  const templateProfiles = await Promise.all(
    normalizedCandidates.map(async (candidate) => ({
      code: candidate.code,
      profile: renderTemplateProfile(await readImageFromSvgTemplate(candidate.svgTemplate))
    }))
  );

  const scores = templateProfiles.map((template) => {
    let bestVariantScore = Number.POSITIVE_INFINITY;
    for (const capture of captureProfiles) {
      const score = compareProfiles(capture, template.profile);
      if (score < bestVariantScore) {
        bestVariantScore = score;
      }
    }
    return {
      code: template.code,
      score: bestVariantScore
    };
  });

  scores.sort((left, right) => left.score - right.score);
  const best = scores[0];
  const second = scores[1];
  if (!best) return null;

  const scoreGap = second ? second.score - best.score : Number.POSITIVE_INFINITY;
  if (best.score > 0.2 || scoreGap < 0.003) {
    return null;
  }

  return {
    code: best.code,
    score: best.score,
    scoreGap
  };
}
