"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { CloseIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Button, EmptyState, ErrorNote, Panel, Pill } from "@/components/ui";
import {
  deleteBanner,
  reorderBanners,
  saveBanner,
  type BannerInput,
} from "./actions";

export type BannerRecord = BannerInput & { id: string };

const BLANK: BannerInput = {
  image_url: null,
  image_fit: "cover",
  cta_href: "/",
  sort_order: 0,
  is_active: true,
  eyebrow: "",
  title: "Banner",
  body: "",
  cta_label: "Shop now",
  color_from: "#5c1478",
  color_to: "#c9106c",
  product_slugs: [],
};

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/avif"];
const MAX_BYTES = 30 * 1024 * 1024;

/* ── Inline SVG dots grab handle ──────────────────────────────────────── */
function GrabHandle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5"  cy="4"  r="1.6" />
      <circle cx="11" cy="4"  r="1.6" />
      <circle cx="5"  cy="10" r="1.6" />
      <circle cx="11" cy="10" r="1.6" />
      <circle cx="5"  cy="16" r="1.6" />
      <circle cx="11" cy="16" r="1.6" />
      <circle cx="5"  cy="22" r="1.6" />
      <circle cx="11" cy="22" r="1.6" />
    </svg>
  );
}

/* ── LivePreview — matches the storefront banner container exactly ──────
   HeroCarousel uses:  rounded-2xl overflow-hidden  h-44 sm:h-52 lg:h-60
   Full-width inside max-w-[1400px] with px-3/px-4/px-0 gutters.
   The preview replicates those classes so what you see here = what ships. */
function LivePreview({
  imageUrl,
  imageFit,
  uploading,
  onFilePicked,
  onDragFile,
}: {
  imageUrl: string | null;
  imageFit: "right" | "cover";
  uploading: boolean;
  onFilePicked: (file: File) => void;
  onDragFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div>
      <span className="label mb-1.5 block">
        Live preview
        <span className="ml-1.5 font-normal text-text-faint">
          — matches the storefront banner exactly
        </span>
      </span>

      {/* The container replicates the storefront carousel dimensions */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload banner image"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onDragFile(file);
        }}
        className={`relative h-44 w-full cursor-pointer select-none overflow-hidden rounded-2xl border-2 transition-all duration-200 sm:h-52 lg:h-60 ${
          over
            ? "border-accent-500 ring-4 ring-accent-500/20"
            : imageUrl
            ? "border-transparent"
            : "border-dashed border-line hover:border-shell-600"
        }`}
        style={{ background: imageUrl ? undefined : "hsl(240 5% 10%)" }}
      >
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt="Banner preview"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1400px"
              className={imageFit === "cover" ? "object-cover" : "object-contain"}
              priority
              unoptimized
            />
            {/* hover overlay — click to replace */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/40">
              <span className="rounded-lg bg-black/70 px-4 py-2 text-[12px] font-semibold text-white opacity-0 transition-opacity hover:opacity-100">
                Click or drop to replace
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            {uploading ? (
              <>
                <span className="text-[13px] font-semibold text-text-hi">Uploading…</span>
                <span className="text-[11px] text-text-faint">Compressing to WebP</span>
              </>
            ) : (
              <>
                <span className="text-[13px] font-semibold text-text-hi">
                  {over ? "Drop to upload" : "Click or drag an image here"}
                </span>
                <span className="text-[11px] text-text-faint">
                  PNG · JPG · WEBP · max 30 MB
                </span>
                <span className="text-[10px] text-text-faint">
                  Recommended: 1920 × 600 px or wider
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFilePicked(file);
          e.target.value = "";
        }}
        aria-label="Banner image file input"
      />
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function BannersManager({ banners: initial }: { banners: BannerRecord[] }) {
  const router = useRouter();
  const [banners, setOptimisticOrder] = useOptimistic(initial);
  const [editing, setEditing] = useState<BannerRecord | "new" | null>(null);
  const [values, setValues] = useState<BannerInput>(BLANK);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  /* ── drag-to-reorder state ──────────────────────────────────────────── */
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function onDragStart(i: number) { dragIndex.current = i; }
  function onDragOver(e: React.DragEvent, i: number) { e.preventDefault(); setOverIndex(i); }
  function onDragEnd() { setOverIndex(null); dragIndex.current = null; }
  function onDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === dropIndex) { onDragEnd(); return; }
    const reordered = [...banners];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    setOverIndex(null);
    dragIndex.current = null;
    startTransition(async () => {
      // Show the new order straight away; the server confirms it a moment later.
      setOptimisticOrder(reordered);
      const r = await reorderBanners(reordered.map((b) => b.id));
      if (!r.ok) setSaveError(r.error);
      router.refresh();
    });
  }

  /* ── image upload (compress → supabase) ────────────────────────────── */
  async function handleFile(file: File) {
    setUploadError(null);
    if (!ACCEPTED.includes(file.type)) {
      setUploadError("Upload a PNG, JPG or WEBP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("File too large — keep it under 30 MB.");
      return;
    }
    setUploading(true);
    try {
      // High-quality WebP — 2400px cap, quality 0.93 (sharp on retina)
      const result = await compressImage(file, { maxEdge: 2400, quality: 0.93 });
      const supabase = createClient();
      const ext = result.file.type.split("/")[1] || "webp";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("banner-images")
        .upload(path, result.file, { contentType: result.file.type, cacheControl: "31536000" });
      if (error) { setUploadError(error.message); return; }
      const { data: { publicUrl } } = supabase.storage.from("banner-images").getPublicUrl(path);
      // Update preview immediately
      setValues((v) => ({ ...v, image_url: publicUrl }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Could not process the image.");
    } finally {
      setUploading(false);
    }
  }

  /* ── editor helpers ─────────────────────────────────────────────────── */
  const openNew = () => {
    setValues({ ...BLANK, sort_order: banners.length });
    setUploadError(null);
    setSaveError(null);
    setEditing("new");
  };
  const openEdit = (b: BannerRecord) => {
    setValues({ ...b });
    setUploadError(null);
    setSaveError(null);
    setEditing(b);
  };
  const set = <K extends keyof BannerInput>(key: K, value: BannerInput[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    startTransition(async () => {
      const id = editing && editing !== "new" ? editing.id : null;
      const r = await saveBanner(id, values);
      if (!r.ok) { setSaveError(r.error); return; }
      setEditing(null);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      // Drop it from the list immediately; the refresh below confirms.
      setOptimisticOrder(banners.filter((b) => b.id !== id));
      const r = await deleteBanner(id);
      if (!r.ok) setSaveError(r.error);
      setConfirmId(null);
      router.refresh();
    });
  };

  /* ── render ─────────────────────────────────────────────────────────── */

  /* When editing, show a full-width editor above the list */
  if (editing) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {/* ── Full-width live preview editor ── */}
        <Panel
          title={editing === "new" ? "New banner" : "Edit banner"}
          action={
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-[11px] font-medium text-text-dim hover:text-text-hi"
            >
              Cancel
            </button>
          }
        >
          <form onSubmit={submit} className="flex flex-col gap-4">
            {/* ── LIVE PREVIEW — full width, exact storefront dimensions ── */}
            <LivePreview
              imageUrl={values.image_url}
              imageFit={values.image_fit}
              uploading={uploading}
              onFilePicked={handleFile}
              onDragFile={handleFile}
            />

            {uploadError && <ErrorNote>{uploadError}</ErrorNote>}

            {/* Controls row below the preview */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Image fit — only when image exists */}
              {values.image_url && (
                <label className="flex items-center gap-2 text-[12px] text-text-dim">
                  <span className="label !mb-0">Fit</span>
                  <select
                    value={values.image_fit}
                    onChange={(e) => set("image_fit", e.target.value as "right" | "cover")}
                    className="field !py-1 !text-[12px]"
                  >
                    <option value="cover">Cover (may crop)</option>
                    <option value="right">Contain (full image)</option>
                  </select>
                </label>
              )}

              {/* Remove image */}
              {values.image_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => set("image_url", null)}
                  disabled={uploading}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Remove image
                </Button>
              )}

              {/* Visibility toggle */}
              <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12px] text-text-dim">
                <input
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="accent-[#10b981]"
                />
                Live on storefront
              </label>
            </div>

            {saveError && <ErrorNote>{saveError}</ErrorNote>}

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={pending || uploading || !values.image_url}
                className="flex-1"
              >
                {pending ? "Saving…" : editing === "new" ? "Publish banner" : "Save changes"}
              </Button>
              <Button type="button" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>

        {/* ── banner list still visible below while editing ── */}
        {banners.length > 0 && (
          <BannerList
            banners={banners}
            
            editingId={editing !== "new" ? editing.id : null}
            confirmId={confirmId}
            setConfirmId={setConfirmId}
            pending={pending}
            dragIndex={dragIndex}
            overIndex={overIndex}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            openEdit={openEdit}
            remove={remove}
          />
        )}
      </div>
    );
  }

  /* Default view — just the list + "New" button */
  return (
    <div className="flex flex-col gap-4">
      {saveError && <ErrorNote>{saveError}</ErrorNote>}

      {banners.length === 0 ? (
        <Panel>
          <EmptyState
            title="No banners yet"
            hint="Upload full-width images for the home page hero carousel."
            action={
              <Button variant="primary" onClick={openNew}>
                <PlusIcon className="h-3.5 w-3.5" />
                Add first banner
              </Button>
            }
          />
        </Panel>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-text-faint">Drag ⠿ to reorder slides</p>
            <Button variant="primary" size="sm" onClick={openNew}>
              <PlusIcon className="h-3.5 w-3.5" />
              New banner
            </Button>
          </div>
          <BannerList
            banners={banners}
            
            editingId={null}
            confirmId={confirmId}
            setConfirmId={setConfirmId}
            pending={pending}
            dragIndex={dragIndex}
            overIndex={overIndex}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            openEdit={openEdit}
            remove={remove}
          />
        </>
      )}
    </div>
  );
}

/* ── BannerList — shared between both views ─────────────────────────── */
function BannerList({
  banners, editingId, confirmId, setConfirmId,
  pending, dragIndex, overIndex,
  onDragStart, onDragOver, onDragEnd, onDrop,
  openEdit, remove,
}: {
  banners: BannerRecord[];
  editingId: string | null;
  confirmId: string | null;
  setConfirmId: (id: string | null) => void;
  pending: boolean;
  dragIndex: React.RefObject<number | null>;
  overIndex: number | null;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, i: number) => void;
  openEdit: (b: BannerRecord) => void;
  remove: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {banners.map((b, i) => {
        const isEditing = b.id === editingId;
        const isDragOver = overIndex === i && dragIndex.current !== i;
        return (
          <li
            key={b.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDrop={(e) => onDrop(e, i)}
            onDragEnd={onDragEnd}
            className={`group relative overflow-hidden rounded-xl border transition-all duration-150 ${
              isEditing
                ? "border-accent-500 ring-2 ring-accent-500/30"
                : isDragOver
                ? "scale-[1.01] border-accent-500 ring-2 ring-accent-500/20"
                : "border-line bg-shell-900"
            } ${dragIndex.current === i ? "opacity-40" : ""}`}
          >
            {/* Thumbnail — exact storefront banner proportions */}
            <div className="relative h-28 w-full bg-shell-850 sm:h-36">
              {b.image_url ? (
                <Image
                  src={b.image_url}
                  alt=""
                  fill
                  sizes="(max-width:1280px) 100vw, 900px"
                  className={b.image_fit === "cover" ? "object-cover" : "object-contain"}
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-[11px] text-text-faint">No image</span>
                </div>
              )}

              {/* Grab handle */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
                <GrabHandle className="h-5 w-3 text-white drop-shadow" />
              </div>

              {/* Status pill */}
              <div className="absolute right-2 top-2 flex gap-1.5">
                {isEditing && (
                  <span className="rounded-md bg-accent-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    editing
                  </span>
                )}
                {!b.is_active && <Pill tone="bad">Hidden</Pill>}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[11px] text-text-faint">
                Slide {i + 1}{b.is_active ? "" : " · hidden"}
              </span>

              <Button size="sm" onClick={() => openEdit(b)}>
                Edit
              </Button>

              {confirmId === b.id ? (
                <span className="flex gap-1.5">
                  <Button size="sm" variant="danger" disabled={pending} onClick={() => remove(b.id)}>
                    Confirm delete
                  </Button>
                  <Button size="sm" onClick={() => setConfirmId(null)}>
                    <CloseIcon className="h-3 w-3" />
                  </Button>
                </span>
              ) : (
                <Button size="sm" variant="danger" onClick={() => setConfirmId(b.id)} aria-label="Delete banner">
                  <TrashIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
