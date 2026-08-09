"use client";

import * as XLSX from "xlsx";

/** One product row as it appears in a spreadsheet. */
export type SheetRow = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  description: string;
  stock: number;
  rating: number;
  image_url: string;
  tags: string;
  active: string;
  /** Packs are flattened: "label|unit|price|mrp|weight" separated by `;` */
  packs: string;
};

export const SHEET_COLUMNS: (keyof SheetRow)[] = [
  "slug",
  "name",
  "brand",
  "category",
  "unit",
  "description",
  "stock",
  "rating",
  "image_url",
  "tags",
  "active",
  "packs",
];

/** Header aliases so an export from another tool still lines up. */
const ALIASES: Record<string, keyof SheetRow> = {
  slug: "slug",
  handle: "slug",
  sku: "slug",
  name: "name",
  title: "name",
  product: "name",
  "product name": "name",
  brand: "brand",
  vendor: "brand",
  category: "category",
  "category slug": "category",
  unit: "unit",
  size: "unit",
  "pack size": "unit",
  description: "description",
  details: "description",
  stock: "stock",
  quantity: "stock",
  qty: "stock",
  inventory: "stock",
  rating: "rating",
  image_url: "image_url",
  image: "image_url",
  "image url": "image_url",
  photo: "image_url",
  tags: "tags",
  active: "active",
  published: "active",
  visible: "active",
  packs: "packs",
  variants: "packs",
};

export function normaliseHeader(header: string): keyof SheetRow | null {
  return ALIASES[header.trim().toLowerCase()] ?? null;
}

/** Reads a .csv / .xlsx / .xls file into raw objects keyed by their headers. */
export async function readSheet(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const first = workbook.SheetNames[0];
  if (!first) return [];

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[first], {
    defval: "",
    raw: false,
  });
}

export function downloadSheet(
  rows: Record<string, unknown>[],
  filename: string,
  format: "csv" | "xlsx"
) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Products");
  XLSX.writeFile(book, `${filename}.${format}`, { bookType: format });
}

/** A ready-to-fill template with one worked example. */
export function downloadTemplate(format: "csv" | "xlsx") {
  downloadSheet(
    [
      {
        slug: "basmati-rice",
        name: "Basmati Rice",
        brand: "SZepto Select",
        category: "atta-rice-oil",
        unit: "5 kg",
        description: "Long grain aged basmati rice.",
        stock: 120,
        rating: 4.5,
        image_url: "",
        tags: "staples, rice",
        active: "yes",
        packs: "1 kg|1 kg|109|119|1;5 kg|5 kg|459|549|5;10 kg|10 kg|809|1049|10",
      },
    ],
    "szepto-products-template",
    format
  );
}
