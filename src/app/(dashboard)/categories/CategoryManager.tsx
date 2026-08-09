"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { CloseIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Button, EmptyState, ErrorNote, Panel, Pill } from "@/components/ui";
import { deleteCategory, saveCategory, type CategoryInput } from "./actions";

export type CategoryRecord = CategoryInput & { id: string; productCount: number };

const BLANK: CategoryInput = {
  slug: "",
  name: "",
  short_name: "",
  group_name: "Grocery & Kitchen",
  tint: "#f6f4f9",
  image_url: null,
  sort_order: 0,
  is_active: true,
};

export function CategoryManager({ categories }: { categories: CategoryRecord[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryRecord | "new" | null>(null);
  const [values, setValues] = useState<CategoryInput>(BLANK);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Existing panel headings, so new categories can reuse one without retyping.
  const groups = Array.from(new Set(categories.map((c) => c.group_name))).sort();

  const openNew = () => {
    setValues({ ...BLANK, sort_order: categories.length });
    setEditing("new");
    setError(null);
  };

  const openEdit = (c: CategoryRecord) => {
    setValues({
      slug: c.slug,
      name: c.name,
      short_name: c.short_name,
      group_name: c.group_name,
      tint: c.tint,
      image_url: c.image_url,
      sort_order: c.sort_order,
      is_active: c.is_active,
    });
    setEditing(c);
    setError(null);
  };

  const set = <K extends keyof CategoryInput>(key: K, value: CategoryInput[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const id = editing && editing !== "new" ? editing.id : null;
      const result = await saveCategory(id, values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (!result.ok) {
        setError(result.error);
        setConfirmId(null);
        return;
      }
      setConfirmId(null);
      router.refresh();
    });
  };

  const grouped = groups.map((g) => ({
    group: g,
    items: categories.filter((c) => c.group_name === g),
  }));

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        {categories.length === 0 ? (
          <Panel>
            <EmptyState
              title="No categories yet"
              action={
                <Button variant="primary" size="sm" onClick={openNew}>
                  Add category
                </Button>
              }
            />
          </Panel>
        ) : (
          grouped.map(({ group, items }) => (
            <Panel key={group} title={group} padded={false}>
              <ul className="divide-y divide-line-soft">
                {items.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span
                      className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg"
                      style={{ backgroundColor: c.tint }}
                    >
                      {c.image_url && (
                        <Image
                          src={c.image_url}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-contain p-1"
                          unoptimized
                        />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-text-hi">
                          {c.name}
                        </span>
                        {!c.is_active && <Pill tone="bad">Hidden</Pill>}
                      </span>
                      <span className="block truncate text-[11px] text-text-faint">
                        {c.slug}
                      </span>
                    </span>

                    <Pill>{c.productCount} products</Pill>

                    <Button size="sm" onClick={() => openEdit(c)}>
                      Edit
                    </Button>

                    {confirmId === c.id ? (
                      <span className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={pending}
                          onClick={() => remove(c.id)}
                        >
                          Confirm
                        </Button>
                        <Button size="sm" onClick={() => setConfirmId(null)}>
                          <CloseIcon className="h-3 w-3" />
                        </Button>
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setConfirmId(c.id)}
                        aria-label={`Delete ${c.name}`}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          ))
        )}
      </div>

      {/* Editor */}
      <Panel
        title={editing === "new" ? "New category" : editing ? "Edit category" : "Categories"}
        action={
          editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-[12px] font-semibold text-text-dim hover:text-text-hi"
            >
              Cancel
            </button>
          ) : (
            <Button size="sm" variant="primary" onClick={openNew}>
              <PlusIcon className="h-3.5 w-3.5" />
              New
            </Button>
          )
        }
      >
        {!editing ? (
          <p className="text-[12px] text-text-dim">Select a category, or create one.</p>
        ) : (
          <form onSubmit={submit}>
            <label className="block">
              <span className="label">Name</span>
              <input
                required
                value={values.name}
                onChange={(e) => {
                  const name = e.target.value;
                  set("name", name);
                  // Only auto-fill slug for new records — never rewrite a live URL.
                  if (editing === "new") {
                    set("slug", name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
                    if (!values.short_name) set("short_name", name);
                  }
                }}
                placeholder="Category name"
                className="field"
              />
            </label>

            <label className="mt-3 block">
              <span className="label">Short name (tile label)</span>
              <input
                required
                value={values.short_name}
                onChange={(e) => set("short_name", e.target.value)}
                placeholder="Short label"
                className="field"
              />
            </label>

            <label className="mt-3 block">
              <span className="label">Slug</span>
              <input
                required
                value={values.slug}
                onChange={(e) =>
                  set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                className="field"
              />
            </label>

            <label className="mt-3 block">
              <span className="label">Panel heading</span>
              <input
                required
                list="category-groups"
                value={values.group_name}
                onChange={(e) => set("group_name", e.target.value)}
                className="field"
              />
              <datalist id="category-groups">
                {groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Tile tint</span>
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={values.tint}
                    onChange={(e) => set("tint", e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-line bg-shell-900"
                    aria-label="Tile tint colour"
                  />
                  <input
                    value={values.tint}
                    onChange={(e) => set("tint", e.target.value)}
                    className="field flex-1"
                  />
                </span>
              </label>

              <label className="block">
                <span className="label">Sort order</span>
                <input
                  type="number"
                  value={values.sort_order}
                  onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
                  className="field tnum"
                />
              </label>
            </div>

            <div className="mt-3">
              <span className="label">Tile image</span>
              <ImageUpload
                bucket="product-images"
                value={values.image_url}
                onChange={(url) => set("image_url", url)}
              />
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-text-dim">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
                className="accent-[#10b981]"
              />
              Visible on the storefront
            </label>

            <Button type="submit" variant="primary" disabled={pending} className="mt-4 w-full">
              {pending ? "Saving…" : editing === "new" ? "Create category" : "Save changes"}
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
