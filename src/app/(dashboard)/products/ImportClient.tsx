"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { Button, ErrorNote, Panel, Pill } from "@/components/ui";
import { normaliseHeader, readSheet, downloadTemplate, type SheetRow } from "@/lib/sheet";
import { importProducts, type ImportPack, type ImportProduct } from "./importActions";

type ParsedRow = {
  line: number;
  product: ImportProduct;
  errors: string[];
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const num = (v: unknown, fallback = 0) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

const truthy = (v: unknown) => {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "" || ["yes", "y", "true", "1", "active", "visible"].includes(s);
};

/** Mirrors the storefront's unit parser so seeded weights match live pricing. */
function guessWeightKg(unit: string): number {
  const m = unit.match(/([\d.]+)\s*(kg|g|l|ml|pcs|pc|pack|packs)/i);
  if (!m) return 0.5;
  const qty = parseFloat(m[1]);
  if (!qty || Number.isNaN(qty)) return 0.5;
  switch (m[2].toLowerCase()) {
    case "kg": return qty;
    case "g": return qty / 1000;
    case "l": return qty;
    case "ml": return qty / 1000;
    case "pcs":
    case "pc": return qty * 0.15;
    default: return qty * 0.5;
  }
}

/** "1 kg|1 kg|109|119|1; 5 kg|5 kg|459|549|5" */
function parsePacks(raw: string, fallbackUnit: string): ImportPack[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];

  return text
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [label, unit, price, mrp, weight] = chunk.split("|").map((p) => p.trim());
      const packUnit = unit || label || fallbackUnit;
      return {
        label: label || packUnit,
        unit: packUnit,
        price: num(price),
        mrp: num(mrp, num(price)),
        weight_kg: weight ? num(weight, guessWeightKg(packUnit)) : guessWeightKg(packUnit),
      };
    });
}

function toParsedRow(raw: Record<string, unknown>, line: number, categorySlugs: Set<string>): ParsedRow {
  // Map arbitrary headers onto our field names.
  const mapped: Partial<Record<keyof SheetRow, unknown>> = {};
  for (const [header, value] of Object.entries(raw)) {
    const field = normaliseHeader(header);
    if (field) mapped[field] = value;
  }

  const name = String(mapped.name ?? "").trim();
  const slug = String(mapped.slug ?? "").trim() || slugify(name);
  const unit = String(mapped.unit ?? "").trim() || "1 unit";
  const category = String(mapped.category ?? "").trim();

  let packs = parsePacks(String(mapped.packs ?? ""), unit);
  // A sheet with no packs column still needs one sellable pack.
  if (packs.length === 0) {
    packs = [{ label: unit, unit, price: 0, mrp: 0, weight_kg: guessWeightKg(unit) }];
  }

  const errors: string[] = [];
  if (!name) errors.push("Name is required");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) errors.push("Invalid slug");
  if (category && !categorySlugs.has(category)) errors.push(`Unknown category "${category}"`);
  if (packs.every((p) => p.price <= 0)) errors.push("No pack has a price");

  return {
    line,
    errors,
    product: {
      slug,
      name,
      brand: String(mapped.brand ?? "").trim() || "Kiranaclick Select",
      category,
      unit,
      description: String(mapped.description ?? "").trim(),
      stock: num(mapped.stock, 0),
      rating: Math.min(5, Math.max(0, num(mapped.rating, 0))),
      image_url: String(mapped.image_url ?? "").trim() || null,
      tags: String(mapped.tags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      is_active: truthy(mapped.active),
      packs,
    },
  };
}

export function ImportClient({ categorySlugs }: { categorySlugs: string[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; updated: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);

  const known = new Set(categorySlugs);
  const valid = rows.filter((r) => r.errors.length === 0);
  const invalid = rows.filter((r) => r.errors.length > 0);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setDone(null);

    try {
      const raw = await readSheet(file);
      if (raw.length === 0) {
        setError("That file has no rows.");
        return;
      }
      setRows(raw.map((r, i) => toParsedRow(r, i + 2, known)));
      setFileName(file.name);
    } catch {
      setError("Couldn't read that file. Use .csv, .xlsx or .xls.");
    }
  };

  const runImport = () => {
    setError(null);
    startTransition(async () => {
      const result = await importProducts(valid.map((r) => r.product));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone({ created: result.created, updated: result.updated });
      setRows([]);
      setFileName(null);
      router.refresh();
    });
  };

  const reset = () => {
    setRows([]);
    setFileName(null);
    setError(null);
    setDone(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-label="Spreadsheet file"
      />

      {done && (
        <div className="flex items-center gap-2.5 rounded-xl bg-ok-500/10 px-4 py-3">
          <CheckIcon className="h-4 w-4 shrink-0 text-ok-400" />
          <p className="text-[13px] text-ok-400">
            <span className="font-semibold">{done.created} added</span>
            {done.updated > 0 && <span> · {done.updated} updated</span>}
          </p>
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      {rows.length === 0 ? (
        <Panel>
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
              void handleFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-14 text-center transition-colors ${
              dragging ? "border-accent-500 bg-accent-500/5" : "border-line hover:border-shell-600"
            }`}
          >
            <span className="text-[14px] font-semibold text-text-hi">
              Drop a spreadsheet here
            </span>
            <span className="text-[12px] text-text-faint">CSV, XLSX or XLS</span>
          </button>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => downloadTemplate("xlsx")}>
              Excel template
            </Button>
            <Button size="sm" onClick={() => downloadTemplate("csv")}>
              CSV template
            </Button>
          </div>

          <dl className="mt-5 grid gap-x-6 gap-y-2 border-t border-line-soft pt-4 text-[12px] sm:grid-cols-2">
            <Hint term="slug" desc="Unique id. Auto-filled from the name if blank." />
            <Hint term="name" desc="Required." />
            <Hint term="category" desc="Category slug, e.g. atta-rice-oil" />
            <Hint term="packs" desc="label|unit|price|mrp|weight — separate packs with ;" />
            <Hint term="tags" desc="Comma separated." />
            <Hint term="active" desc="yes / no. Blank means yes." />
          </dl>
        </Panel>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="ok">{valid.length} ready</Pill>
            {invalid.length > 0 && <Pill tone="bad">{invalid.length} with problems</Pill>}
            {fileName && <span className="text-[12px] text-text-faint">{fileName}</span>}

            <span className="ml-auto flex gap-2">
              <Button size="sm" onClick={reset} disabled={pending}>
                <CloseIcon className="h-3 w-3" />
                Clear
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={runImport}
                disabled={pending || valid.length === 0}
              >
                {pending ? "Importing…" : `Import ${valid.length}`}
              </Button>
            </span>
          </div>

          <Panel padded={false}>
            <div className="thin-scrollbar max-h-[32rem] overflow-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-shell-900">
                  <tr className="border-b border-line-soft text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Slug</th>
                    <th className="hidden px-3 py-2 sm:table-cell">Category</th>
                    <th className="px-3 py-2 text-right">Packs</th>
                    <th className="hidden px-3 py-2 text-right sm:table-cell">Stock</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {rows.map((r) => (
                    <tr key={r.line} className={r.errors.length ? "bg-bad-500/5" : ""}>
                      <td className="tnum px-3 py-2 text-text-faint">{r.line}</td>
                      <td className="px-3 py-2 text-text-hi">{r.product.name || "—"}</td>
                      <td className="px-3 py-2 text-text-dim">{r.product.slug || "—"}</td>
                      <td className="hidden px-3 py-2 text-text-dim sm:table-cell">
                        {r.product.category || "—"}
                      </td>
                      <td className="tnum px-3 py-2 text-right text-text-dim">
                        {r.product.packs.length}
                      </td>
                      <td className="tnum hidden px-3 py-2 text-right text-text-dim sm:table-cell">
                        {r.product.stock}
                      </td>
                      <td className="px-3 py-2">
                        {r.errors.length ? (
                          <span className="text-[11px] text-bad-400">{r.errors.join(", ")}</span>
                        ) : (
                          <CheckIcon className="h-3.5 w-3.5 text-ok-400" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function Hint({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-mono text-text-hi">{term}</dt>
      <dd className="text-text-faint">{desc}</dd>
    </div>
  );
}
