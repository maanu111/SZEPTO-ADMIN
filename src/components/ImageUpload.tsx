"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { Button, ErrorNote } from "@/components/ui";
import { compressImage, formatBytes } from "@/lib/compressImage";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 30 * 1024 * 1024;  // 30 MB
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/avif"];

type Props = {
  bucket: "product-images" | "payment-qr" | "banner-images";
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: "square" | "wide";
  hint?: string;
};

/**
 * Uploads to Supabase Storage, compressing first.
 *
 * QR codes keep a higher resolution and lossless-ish quality so scanners still
 * read them; product photos are aggressively downscaled.
 */
/**
 * Per-bucket compression profiles.
 *
 * maxEdge: longest dimension cap in pixels — images smaller than this are never
 *          upscaled, so the setting is just a ceiling.
 * quality: 0–1 WebP quality. We err on the side of quality; the compressor
 *          already refuses to save a file that ends up *larger* than the source.
 *
 * Guidelines used here:
 *   • Banner artwork ships full-width on retina screens → high res, high quality.
 *   • Product cards display at ~300 px on mobile but up to 600 px on desktop.
 *   • QR codes must be scannable → never touch resolution, highest quality.
 */
const PROFILE = {
  "product-images": { maxEdge: 1400, quality: 0.88 },
  "payment-qr":     { maxEdge: 1600, quality: 0.96 },
  "banner-images":  { maxEdge: 2400, quality: 0.93 },
} as const;

export function ImageUpload({ bucket, value, onChange, aspect = "square", hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSavedNote(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Upload a PNG, JPG or WEBP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`That file is ${formatBytes(file.size)}. Keep it under 25 MB.`);
      return;
    }

    setBusy(true);
    try {
      const result = await compressImage(file, PROFILE[bucket]);

      const supabase = createClient();
      const ext = result.file.type.split("/")[1] || "webp";
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, result.file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: result.file.type,
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      onChange(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);

      if (result.saved > 0.05) {
        setSavedNote(
          `${formatBytes(result.originalBytes)} → ${formatBytes(result.bytes)} (${Math.round(
            result.saved * 100
          )}% smaller)`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process that image.");
    } finally {
      setBusy(false);
    }
  };

  const box = aspect === "square" ? "aspect-square max-w-[15rem]" : "aspect-[16/9]";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(e) => upload(e.target.files?.[0])}
        aria-label="Upload image"
      />

      {value ? (
        <div>
          <div className={`relative ${box} overflow-hidden rounded-xl bg-white`}>
            <Image src={value} alt="Uploaded" fill sizes="240px" className="object-contain" unoptimized />
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? "Uploading…" : "Replace"}
            </Button>
            <Button size="sm" variant="danger" onClick={() => onChange(null)} disabled={busy}>
              <CloseIcon className="h-3 w-3" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void upload(e.dataTransfer.files?.[0]);
          }}
          className={`flex ${box} w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 text-center transition-colors ${
            dragging ? "border-accent-500 bg-accent-500/5" : "border-line hover:border-shell-600"
          }`}
        >
          <span className="text-[13px] font-semibold text-text-hi">
            {busy ? "Compressing…" : "Upload image"}
          </span>
          <span className="text-[11px] text-text-faint">{hint ?? "PNG or JPG"}</span>
        </button>
      )}

      {savedNote && <p className="mt-2 text-[11px] text-ok-400">{savedNote}</p>}

      {error && (
        <div className="mt-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </div>
  );
}
