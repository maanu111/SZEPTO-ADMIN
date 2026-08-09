"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "./icons";

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

type Props = {
  /** Tabular data. Pass an empty array to show the options disabled. */
  rows?: ExportRow[];
  /** Base filename, without extension. */
  filename: string;
  /** id of a DOM node to rasterise for the image export. */
  captureId?: string;
  label?: string;
};

type Format = {
  key: string;
  label: string;
  hint: string;
  /** true = needs rows, false = needs captureId */
  needsRows: boolean;
};

const FORMATS: Format[] = [
  { key: "csv", label: "CSV", hint: "Spreadsheets, imports", needsRows: true },
  { key: "xlsx", label: "Excel", hint: ".xlsx workbook", needsRows: true },
  { key: "json", label: "JSON", hint: "Raw data", needsRows: true },
  { key: "png", label: "Image", hint: "PNG screenshot", needsRows: false },
  { key: "pdf", label: "PDF", hint: "Via print dialog", needsRows: false },
];

/** Every export format for a page, behind one button. */
export function ExportMenu({ rows, filename, captureId, label = "Export" }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `${filename}-${stamp}`;
  const hasRows = Boolean(rows && rows.length > 0);

  const download = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const run = async (format: string) => {
    setBusy(format);
    try {
      if (format === "json" && rows) {
        download(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }), "json");
      }

      if ((format === "csv" || format === "xlsx") && rows) {
        // Loaded on demand — SheetJS is large and most sessions never export.
        const XLSX = await import("xlsx");
        const sheet = XLSX.utils.json_to_sheet(rows);
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Export");
        XLSX.writeFile(book, `${name}.${format}`, { bookType: format });
      }

      if (format === "png" && captureId) {
        const node = document.getElementById(captureId);
        if (!node) throw new Error("Nothing to capture.");
        const { toBlob } = await import("html-to-image");
        const blob = await toBlob(node, {
          // Match the shell so the export isn't transparent.
          backgroundColor: "#000000",
          pixelRatio: 2,
          cacheBust: true,
        });
        if (blob) download(blob, "png");
      }

      if (format === "pdf") {
        // The browser's own dialog handles PDF far better than a bundled library.
        window.print();
      }

      setOpen(false);
    } catch {
      // Nothing downloaded; leave the menu open so it can be retried.
    } finally {
      setBusy(null);
    }
  };

  const available = FORMATS.filter((f) => (f.needsRows ? rows !== undefined : Boolean(captureId)));
  if (available.length === 0) return null;

  return (
    <div ref={wrapRef} className="relative print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-shell-850 px-3 text-[12px] font-semibold text-text-hi transition-colors hover:bg-shell-800"
      >
        {label}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-line bg-shell-900 py-1 shadow-pop"
        >
          {available.map((f) => {
            const disabled = f.needsRows && !hasRows;
            return (
              <button
                key={f.key}
                type="button"
                role="menuitem"
                disabled={disabled || busy !== null}
                onClick={() => run(f.key)}
                className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left transition-colors hover:bg-shell-850 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <span>
                  <span className="block text-[12px] text-text-hi">{f.label}</span>
                  <span className="block text-[10px] text-text-faint">
                    {disabled ? "Nothing to export yet" : f.hint}
                  </span>
                </span>
                {busy === f.key && (
                  <span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-text-faint border-t-text-hi" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
