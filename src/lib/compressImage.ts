"use client";

export type CompressOptions = {
  /** Longest edge, in px. Anything larger is scaled down. */
  maxEdge?: number;
  /** 0–1. Applied to WebP/JPEG; ignored for PNG output. */
  quality?: number;
  /** Keep transparency (PNG source) by encoding WebP instead of JPEG. */
  preserveAlpha?: boolean;
};

export type CompressResult = {
  file: File;
  originalBytes: number;
  bytes: number;
  width: number;
  height: number;
  /** 0.82 means the upload is 82% smaller than the original. */
  saved: number;
};

const DEFAULTS: Required<CompressOptions> = {
  maxEdge: 1200,
  quality: 0.82,
  preserveAlpha: true,
};

/** Does the browser encode this type? Safari lagged on WebP for a long time. */
function canEncode(type: string): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL(type).startsWith(`data:${type}`);
}

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a readable image."));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image."))),
      type,
      quality
    );
  });
}

/**
 * Shrinks an image before it reaches Supabase Storage.
 *
 * Storage is billed on what you keep, and phone cameras produce 3–8 MB files for
 * images that display at a few hundred pixels. Downscaling to `maxEdge` and
 * re-encoding as WebP typically cuts 90%+ with no visible difference.
 *
 * If compression somehow produces a larger file than the original, the original
 * is returned instead.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const { maxEdge, quality, preserveAlpha } = { ...DEFAULTS, ...options };

  // SVGs are already tiny and rasterising them would lose their scalability.
  if (file.type === "image/svg+xml") {
    return {
      file,
      originalBytes: file.size,
      bytes: file.size,
      width: 0,
      height: 0,
      saved: 0,
    };
  }

  const img = await loadBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const needsAlpha = preserveAlpha && (file.type === "image/png" || file.type === "image/webp");
  if (!needsAlpha) {
    // Flatten onto white so transparent areas don't turn black in JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  const targetType = canEncode("image/webp") ? "image/webp" : needsAlpha ? "image/png" : "image/jpeg";
  const blob = await toBlob(canvas, targetType, quality);

  // Rare, but a small already-optimised source can grow when re-encoded.
  if (blob.size >= file.size) {
    return {
      file,
      originalBytes: file.size,
      bytes: file.size,
      width: img.naturalWidth,
      height: img.naturalHeight,
      saved: 0,
    };
  }

  const ext = targetType.split("/")[1];
  const base = file.name.replace(/\.[^.]+$/, "") || "image";

  return {
    file: new File([blob], `${base}.${ext}`, { type: targetType }),
    originalBytes: file.size,
    bytes: blob.size,
    width,
    height,
    saved: 1 - blob.size / file.size,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
