import Link from "next/link";
import { SearchIcon } from "./icons";

export type FilterOption = { value: string; label: string; count?: number };

/**
 * A row of always-visible filters.
 *
 * Everything is a plain link or a GET form, so filter state lives in the URL —
 * shareable, back-button friendly, and it works before hydration.
 */
export function FilterBar({
  action,
  hidden,
  searchName = "q",
  searchValue,
  searchPlaceholder,
  groups,
  trailing,
}: {
  /** Form target, e.g. "/products" */
  action: string;
  /** Params to preserve when searching, as name/value pairs. */
  hidden?: Record<string, string>;
  searchName?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  /** Segmented link groups, rendered left to right. */
  groups?: {
    label: string;
    param: string;
    active: string;
    options: FilterOption[];
    href: (param: string, value: string) => string;
  }[];
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      {searchValue !== undefined && (
        <form action={action} className="flex min-w-0 flex-1 items-center sm:max-w-[15rem]">
          {Object.entries(hidden ?? {}).map(([k, v]) =>
            v ? <input key={k} type="hidden" name={k} value={v} /> : null
          )}
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-shell-850 px-2.5 focus-within:bg-shell-800">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-text-faint" />
            <input
              name={searchName}
              defaultValue={searchValue}
              placeholder={searchPlaceholder ?? "Search"}
              aria-label={searchPlaceholder ?? "Search"}
              className="h-full w-full bg-transparent text-[12px] text-text-hi outline-none placeholder:text-text-faint"
            />
          </div>
        </form>
      )}

      {groups?.map((group) => (
        <div key={group.param} className="flex items-center gap-1.5">
          <span className="text-[11px] text-text-faint">{group.label}</span>
          <div className="flex items-center gap-0.5">
            {group.options.map((o) => {
              const active = group.active === o.value;
              return (
                <Link
                  key={o.value}
                  href={group.href(group.param, o.value)}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                    active
                      ? "bg-shell-800 font-medium text-text-hi"
                      : "text-text-dim hover:text-text-hi"
                  }`}
                >
                  {o.label}
                  {o.count !== undefined && (
                    <span className="tnum ml-1 text-text-faint">{o.count}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
    </div>
  );
}
