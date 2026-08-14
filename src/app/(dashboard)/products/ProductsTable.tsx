import Image from "next/image";
import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { ExportMenu } from "@/components/ExportMenu";
import { FilterSelect } from "@/components/FilterSelect";
import { EmptyState, LinkButton, Panel, Pill, inr } from "@/components/ui";

export type ProductRowView = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  category: string;
  packs: number;
  price: number | null;
};

export function ProductsTable({
  products,
  categories,
  term,
  category,
  status,
  stock,
  page,
  pages,
  total,
}: {
  products: ProductRowView[];
  categories: { slug: string; name: string }[];
  term: string;
  category: string;
  status: string;
  stock: string;
  page: number;
  pages: number;
  total: number;
}) {
  const href = (patch: Record<string, string>) => {
    const sp = new URLSearchParams({ view: "list" });
    if (term) sp.set("q", term);
    if (category) sp.set("category", category);
    if (status !== "all") sp.set("status", status);
    if (stock !== "all") sp.set("stock", stock);
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    return `/products?${sp}`;
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Searching must not silently drop the other filters, so every active
            one rides along as a hidden field. */}
        <form action="/products" className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
          <input type="hidden" name="view" value="list" />
          {category && <input type="hidden" name="category" value={category} />}
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          {stock !== "all" && <input type="hidden" name="stock" value={stock} />}
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-shell-850 px-3 focus-within:bg-shell-800">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-text-faint" />
            <input
              name="q"
              defaultValue={term}
              placeholder="Search products"
              aria-label="Search products"
              className="h-full w-full bg-transparent text-[12px] text-text-hi outline-none placeholder:text-text-faint"
            />
          </div>
        </form>

        <FilterSelect
          value={category}
          ariaLabel="Filter by category"
          options={[
            { value: "", label: "All categories", href: href({ category: "", page: "" }) },
            ...categories.map((c) => ({
              value: c.slug,
              label: c.name,
              href: href({ category: c.slug, page: "" }),
            })),
          ]}
          className="shrink-0"
        />

        {/* Status and stock — always on screen, one click each */}
        <FilterGroup
          label="Status"
          active={status}
          options={[
            { value: "all", label: "All" },
            { value: "live", label: "Live" },
            { value: "hidden", label: "Hidden" },
          ]}
          href={(v) => href({ status: v === "all" ? "" : v, page: "" })}
        />

        <FilterGroup
          label="Stock"
          active={stock}
          options={[
            { value: "all", label: "Any" },
            { value: "low", label: "Low" },
            { value: "out", label: "Out" },
          ]}
          href={(v) => href({ stock: v === "all" ? "" : v, page: "" })}
        />

        <span className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-text-faint">{total} total</span>
          <ExportMenu
            rows={products.map((p) => ({
              slug: p.slug,
              name: p.name,
              brand: p.brand,
              category: p.category,
              packs: p.packs,
              price: p.price ?? "",
              stock: p.stock,
              live: p.is_active ? "yes" : "no",
            }))}
            filename="kiranaclick-products"
            captureId="products-capture"
          />
        </span>
      </div>

      <div id="products-capture">
      <Panel padded={false}>
        {products.length === 0 ? (
          <EmptyState
            title={term ? `No products match "${term}"` : "No products yet"}
            action={
              !term ? (
                <LinkButton href="/products/new" variant="primary" size="sm">
                  New product
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Table — md and up */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line-soft text-[11px] font-medium uppercase tracking-wide text-text-faint">
                    <th className="px-4 py-2.5">Product</th>
                    <th className="hidden px-4 py-2.5 lg:table-cell">Category</th>
                    <th className="px-4 py-2.5">Packs</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                    <th className="px-4 py-2.5 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="group relative cursor-pointer transition-colors hover:bg-shell-850"
                    >
                      <td className="px-4 py-2.5">
                        {/* after:inset-0 makes the whole row the click target */}
                        <Link
                          href={`/products/${p.id}`}
                          className="flex items-center gap-3 after:absolute after:inset-0 after:content-['']"
                        >
                          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-shell-850">
                            {p.image_url && (
                              <Image
                                src={p.image_url}
                                alt=""
                                fill
                                sizes="36px"
                                className="object-contain p-1"
                                unoptimized
                              />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[13px] text-text-hi">{p.name}</span>
                              {!p.is_active && <Pill tone="bad">Hidden</Pill>}
                            </span>
                            <span className="block truncate text-[11px] text-text-faint">
                              {p.brand}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="hidden px-4 py-2.5 text-[12px] text-text-dim lg:table-cell">
                        {p.category || "—"}
                      </td>
                      <td className="tnum px-4 py-2.5 text-[12px] text-text-dim">{p.packs}</td>
                      <td className="tnum px-4 py-2.5 text-right text-[13px] text-text-hi">
                        {p.price === null ? "—" : inr(p.price)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={`tnum text-[12px] ${
                            p.stock <= 0 ? "text-bad-400" : "text-text-dim"
                          }`}
                        >
                          {p.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — below md */}
            <ul className="divide-y divide-line-soft md:hidden">
              {products.map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${p.id}`} className="flex items-center gap-3 px-3 py-3">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-shell-850">
                      {p.image_url && (
                        <Image
                          src={p.image_url}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-contain p-1"
                          unoptimized
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] text-text-hi">{p.name}</span>
                        {!p.is_active && <Pill tone="bad">Hidden</Pill>}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-text-faint">
                        {p.category || "—"} · {p.packs} pack{p.packs === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tnum block text-[13px] text-text-hi">
                        {p.price === null ? "—" : inr(p.price)}
                      </span>
                      <span
                        className={`tnum block text-[11px] ${
                          p.stock <= 0 ? "text-bad-400" : "text-text-faint"
                        }`}
                      >
                        {p.stock} left
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
      </div>

      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[12px] text-text-faint">
            {page} / {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={href({ page: String(page - 1) })}
                className="rounded-lg bg-shell-850 px-3 py-1.5 text-[12px] font-medium text-text-hi hover:bg-shell-800"
              >
                Previous
              </Link>
            )}
            {page < pages && (
              <Link
                href={href({ page: String(page + 1) })}
                className="rounded-lg bg-shell-850 px-3 py-1.5 text-[12px] font-medium text-text-hi hover:bg-shell-800"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroup({
  label,
  active,
  options,
  href,
}: {
  label: string;
  active: string;
  options: { value: string; label: string }[];
  href: (value: string) => string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-text-faint">{label}</span>
      <div className="flex items-center gap-0.5">
        {options.map((o) => {
          const on = active === o.value;
          return (
            <Link
              key={o.value}
              href={href(o.value)}
              aria-current={on ? "true" : undefined}
              className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                on ? "bg-shell-800 font-medium text-text-hi" : "text-text-dim hover:text-text-hi"
              }`}
            >
              {o.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
