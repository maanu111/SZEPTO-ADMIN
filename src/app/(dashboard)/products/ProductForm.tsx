"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Button, ErrorNote, Panel, inr } from "@/components/ui";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductInput,
  type VariantInput,
} from "./actions";

type Category = { id: string; name: string };

const BLANK_VARIANT: VariantInput = {
  label: "1 kg",
  unit: "1 kg",
  price: 0,
  mrp: 0,
  weight_kg: 1,
  in_stock: true,
  is_default: true,
};

/** Same parser the storefront uses, so an admin's unit string yields the same weight. */
function guessWeightKg(unit: string): number | null {
  const m = unit.match(/([\d.]+)\s*(kg|g|l|ml|pcs|pc|pack|packs)/i);
  if (!m) return null;
  const qty = parseFloat(m[1]);
  if (!qty || Number.isNaN(qty)) return null;
  switch (m[2].toLowerCase()) {
    case "kg": return qty;
    case "g": return qty / 1000;
    case "l": return qty;
    case "ml": return qty / 1000;
    case "pcs":
    case "pc": return qty * 0.15;
    case "pack":
    case "packs": return qty * 0.5;
    default: return null;
  }
}

export function ProductForm({
  productId,
  categories,
  initial,
  initialVariants,
}: {
  productId?: string;
  categories: Category[];
  initial: ProductInput;
  initialVariants: VariantInput[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductInput>(initial);
  const [variants, setVariants] = useState<VariantInput[]>(
    initialVariants.length ? initialVariants : [BLANK_VARIANT]
  );
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const setVariant = <K extends keyof VariantInput>(i: number, key: K, value: VariantInput[K]) =>
    setVariants((list) => list.map((v, n) => (n === i ? { ...v, [key]: value } : v)));

  const setDefault = (i: number) =>
    setVariants((list) => list.map((v, n) => ({ ...v, is_default: n === i })));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const payload: ProductInput = {
      ...values,
      tags: tagText.split(",").map((t) => t.trim()).filter(Boolean),
    };

    startTransition(async () => {
      const result = productId
        ? await updateProduct(productId, payload, variants)
        : await createProduct(payload, variants);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (!productId && "data" in result && result.data) {
        router.replace(`/products/${result.data.id}`);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      router.refresh();
    });
  };

  const remove = () => {
    if (!productId) return;
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/products");
    });
  };

  return (
    <form onSubmit={submit} className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Panel title="Details">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="label">Name</span>
              <input
                required
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Product name"
                className="field"
              />
            </label>

            <label className="block">
              <span className="label">Slug</span>
              <input
                required
                value={values.slug}
                onChange={(e) =>
                  set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                placeholder="product-slug"
                className="field"
              />
            </label>

            <label className="block">
              <span className="label">Brand</span>
              <input
                value={values.brand}
                onChange={(e) => set("brand", e.target.value)}
                className="field"
              />
            </label>

            <label className="block">
              <span className="label">Category</span>
              <select
                value={values.category_id ?? ""}
                onChange={(e) => set("category_id", e.target.value || null)}
                className="field"
              >
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">Display unit</span>
              <input
                value={values.unit}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="Size"
                className="field"
              />
            </label>

            <label className="block">
              <span className="label">Stock</span>
              <input
                type="number"
                min={0}
                value={values.stock}
                onChange={(e) => set("stock", Math.max(0, Number(e.target.value) || 0))}
                className="field tnum"
              />
            </label>

            <label className="block">
              <span className="label">Rating (0–5)</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={values.rating}
                onChange={(e) =>
                  set("rating", Math.min(5, Math.max(0, Number(e.target.value) || 0)))
                }
                className="field tnum"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="label">Description</span>
              <textarea
                rows={4}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                className="field"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="label">Tags (comma separated)</span>
              <input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="Comma separated"
                className="field"
              />
            </label>

            <label className="block">
              <span className="label">Shipping note</span>
              <input
                value={values.shipping_info ?? ""}
                onChange={(e) => set("shipping_info", e.target.value || null)}
                placeholder="Delivery estimate"
                className="field"
              />
            </label>

            <label className="block">
              <span className="label">Return policy</span>
              <input
                value={values.return_policy ?? ""}
                onChange={(e) => set("return_policy", e.target.value || null)}
                placeholder="Return terms"
                className="field"
              />
            </label>
          </div>
        </Panel>

        {/* Variants */}
        <Panel
          title={`Packs (${variants.length})`}
          action={
            <Button
              type="button"
              size="sm"
              onClick={() =>
                setVariants((list) => [...list, { ...BLANK_VARIANT, is_default: list.length === 0 }])
              }
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add pack
            </Button>
          }
          padded={false}
        >
          <ul className="divide-y divide-line-soft">
            {variants.map((v, i) => (
              <li key={i} className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <label className="block lg:col-span-2">
                    <span className="label">Label</span>
                    <input
                      value={v.label}
                      onChange={(e) => setVariant(i, "label", e.target.value)}
                      placeholder="Pack label"
                      className="field"
                    />
                  </label>

                  <label className="block">
                    <span className="label">Unit</span>
                    <input
                      value={v.unit}
                      onChange={(e) => {
                        const unit = e.target.value;
                        setVariant(i, "unit", unit);
                        const guessed = guessWeightKg(unit);
                        if (guessed !== null) setVariant(i, "weight_kg", Number(guessed.toFixed(3)));
                      }}
                      placeholder="Size"
                      className="field"
                    />
                  </label>

                  <label className="block">
                    <span className="label">Price ₹</span>
                    <input
                      type="number"
                      min={0}
                      value={v.price}
                      onChange={(e) => setVariant(i, "price", Number(e.target.value) || 0)}
                      className="field tnum"
                    />
                  </label>

                  <label className="block">
                    <span className="label">MRP ₹</span>
                    <input
                      type="number"
                      min={0}
                      value={v.mrp}
                      onChange={(e) => setVariant(i, "mrp", Number(e.target.value) || 0)}
                      className="field tnum"
                    />
                  </label>

                  <label className="block">
                    <span className="label">Weight kg</span>
                    <input
                      type="number"
                      min={0}
                      step={0.001}
                      value={v.weight_kg}
                      onChange={(e) => setVariant(i, "weight_kg", Number(e.target.value) || 0)}
                      className="field tnum"
                    />
                  </label>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-text-dim">
                    <input
                      type="radio"
                      name="default-variant"
                      checked={v.is_default}
                      onChange={() => setDefault(i)}
                      className="accent-[#e5147e]"
                    />
                    Default pack
                  </label>

                  <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-text-dim">
                    <input
                      type="checkbox"
                      checked={v.in_stock}
                      onChange={(e) => setVariant(i, "in_stock", e.target.checked)}
                      className="accent-[#10b981]"
                    />
                    In stock
                  </label>

                  {v.mrp > v.price && (
                    <span className="text-[11px] text-ok-400">
                      {Math.floor(((v.mrp - v.price) / v.mrp) * 100)}% off · saves{" "}
                      {inr(v.mrp - v.price)}
                    </span>
                  )}

                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setVariants((list) => list.filter((_, n) => n !== i))}
                      className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-bad-400 hover:text-bad-500"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Right rail */}
      <div className="flex flex-col gap-4">
        <Panel title="Image">
          <ImageUpload
            bucket="product-images"
            value={values.image_url}
            onChange={(url) => set("image_url", url)}
          />
        </Panel>

        <Panel title="Visibility">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="mt-0.5 accent-[#10b981]"
            />
            <span className="text-[13px] font-medium text-text-hi">Visible on storefront</span>
          </label>
        </Panel>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="primary" size="lg" disabled={pending}>
            {pending ? "Saving…" : productId ? "Save changes" : "Create product"}
          </Button>

          {saved && (
            <span className="flex items-center justify-center gap-1 text-[12px] font-semibold text-ok-400">
              <CheckIcon className="h-3.5 w-3.5" /> Saved
            </span>
          )}

          {productId &&
            (confirmDelete ? (
              <div className="rounded-lg border border-bad-500/30 bg-bad-500/10 p-3">
                <p className="text-[12px] font-semibold text-bad-400">Delete this product?</p>
                <div className="mt-2.5 flex gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={pending}
                    onClick={remove}
                    className="flex-1"
                  >
                    Yes, delete
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={() => setConfirmDelete(true)}
              >
                <TrashIcon className="h-4 w-4" />
                Delete product
              </Button>
            ))}
        </div>
      </div>
    </form>
  );
}
