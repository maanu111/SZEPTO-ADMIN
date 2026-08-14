"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import { Button, ErrorNote, Panel, Pill } from "@/components/ui";
import { downloadSheet } from "@/lib/sheet";
import { bulkUpdateProducts } from "./importActions";

export type GridRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  stock: number;
  price: number;
  is_active: boolean;
};

type Column = {
  key: keyof GridRow;
  label: string;
  type: "text" | "number" | "bool";
  editable: boolean;
  width: string;
  align?: "right";
};

const COLUMNS: Column[] = [
  { key: "name", label: "Name", type: "text", editable: true, width: "minmax(12rem,1.6fr)" },
  { key: "slug", label: "Slug", type: "text", editable: false, width: "minmax(9rem,1fr)" },
  { key: "brand", label: "Brand", type: "text", editable: true, width: "minmax(8rem,1fr)" },
  { key: "category", label: "Category", type: "text", editable: false, width: "minmax(8rem,1fr)" },
  { key: "unit", label: "Unit", type: "text", editable: true, width: "7rem" },
  { key: "stock", label: "Stock", type: "number", editable: true, width: "5.5rem", align: "right" },
  { key: "price", label: "Price", type: "number", editable: false, width: "6rem", align: "right" },
  { key: "is_active", label: "Live", type: "bool", editable: true, width: "4rem" },
];

const TEMPLATE = COLUMNS.map((c) => c.width).join(" ");

/**
 * Spreadsheet-style editor for the fields that change most often.
 * Only edited rows are sent on save; pricing stays on the product page where
 * packs and weights live together.
 */
export function BulkGrid({ initial }: { initial: GridRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<GridRow[]>(initial);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q)
    );
  }, [rows, filter]);

  const update = (id: string, key: keyof GridRow, value: string | number | boolean) => {
    setRows((list) => list.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
    setDirty((d) => new Set(d).add(id));
    setSaved(false);
  };

  const save = () => {
    setError(null);
    const changed = rows.filter((r) => dirty.has(r.id));

    startTransition(async () => {
      const result = await bulkUpdateProducts(
        changed.map((r) => ({
          id: r.id,
          name: r.name,
          brand: r.brand,
          unit: r.unit,
          stock: r.stock,
          is_active: r.is_active,
        }))
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDirty(new Set());
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      router.refresh();
    });
  };

  const exportSheet = (format: "csv" | "xlsx") =>
    downloadSheet(
      visible.map((r) => ({
        slug: r.slug,
        name: r.name,
        brand: r.brand,
        category: r.category,
        unit: r.unit,
        stock: r.stock,
        price: r.price,
        active: r.is_active ? "yes" : "no",
      })),
      "kiranaclick-products",
      format
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter rows"
          aria-label="Filter rows"
          className="field h-9 w-full sm:max-w-xs"
        />

        <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {dirty.size > 0 && <Pill tone="accent">{dirty.size} edited</Pill>}
          {saved && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-ok-400">
              <CheckIcon className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Button size="sm" onClick={() => exportSheet("xlsx")}>
            Export Excel
          </Button>
          <Button size="sm" onClick={() => exportSheet("csv")}>
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={save}
            disabled={pending || dirty.size === 0}
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </span>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel padded={false}>
        <div className="thin-scrollbar overflow-auto">
          <div className="min-w-[52rem]">
            {/* Header */}
            <div
              className="sticky top-0 z-10 grid border-b border-line bg-shell-900 text-[11px] font-semibold uppercase tracking-wide text-text-faint"
              style={{ gridTemplateColumns: TEMPLATE }}
            >
              {COLUMNS.map((c) => (
                <div
                  key={c.key}
                  className={`px-2.5 py-2 ${c.align === "right" ? "text-right" : ""}`}
                >
                  {c.label}
                </div>
              ))}
            </div>

            {/* Rows */}
            {visible.map((row) => (
              <div
                key={row.id}
                className={`grid border-b border-line-soft transition-colors hover:bg-shell-850 ${
                  dirty.has(row.id) ? "bg-accent-500/[0.04]" : ""
                }`}
                style={{ gridTemplateColumns: TEMPLATE }}
              >
                {COLUMNS.map((c) => (
                  <Cell key={c.key} column={c} row={row} onChange={update} />
                ))}
              </div>
            ))}

            {visible.length === 0 && (
              <p className="px-3 py-10 text-center text-[13px] text-text-faint">No rows match.</p>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Cell({
  column,
  row,
  onChange,
}: {
  column: Column;
  row: GridRow;
  onChange: (id: string, key: keyof GridRow, value: string | number | boolean) => void;
}) {
  const value = row[column.key];

  if (column.type === "bool") {
    return (
      <div className="flex items-center justify-center px-2.5 py-1.5">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={!column.editable}
          onChange={(e) => onChange(row.id, column.key, e.target.checked)}
          aria-label={`${column.label} for ${row.name}`}
          className="accent-[#10b981]"
        />
      </div>
    );
  }

  if (!column.editable) {
    return (
      <div
        className={`truncate px-2.5 py-2 text-[12px] text-text-faint ${
          column.align === "right" ? "text-right tabular-nums" : ""
        }`}
        title={String(value)}
      >
        {column.key === "price" ? `₹${value}` : String(value) || "—"}
      </div>
    );
  }

  return (
    <input
      value={String(value)}
      type={column.type === "number" ? "number" : "text"}
      onChange={(e) =>
        onChange(
          row.id,
          column.key,
          column.type === "number" ? Math.max(0, Number(e.target.value) || 0) : e.target.value
        )
      }
      aria-label={`${column.label} for ${row.name}`}
      className={`w-full border-0 bg-transparent px-2.5 py-2 text-[12px] text-text-hi outline-none transition-colors focus:bg-shell-800 ${
        column.align === "right" ? "text-right tabular-nums" : ""
      }`}
    />
  );
}
