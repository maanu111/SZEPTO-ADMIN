"use client";

import { useRouter } from "next/navigation";

/**
 * A dropdown filter that actually applies itself.
 *
 * A bare `<select>` inside a GET form does nothing until something submits it,
 * which is why the category filter looked broken — you picked a category and
 * the page never changed. This navigates on change instead.
 *
 * Each option carries its own destination as a plain string. A callback would
 * read better, but functions cannot cross from a Server Component into a Client
 * Component, and passing one crashes the page at render time.
 */
export function FilterSelect({
  value,
  options,
  ariaLabel,
  className = "",
}: {
  value: string;
  options: { value: string; label: string; href: string }[];
  ariaLabel: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => {
        const target = options.find((o) => o.value === e.target.value);
        if (target) router.push(target.href);
      }}
      className={`field h-9 w-auto min-w-[10rem] text-[12px] ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
