import Link from "next/link";
import type { OrderStatus } from "@/lib/database.types";

/* ---------------------------------------------------------------- panels */

export function Panel({
  title,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-line bg-shell-900 shadow-panel ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
          <h2 className="text-[12px] font-semibold text-text-hi">{title}</h2>
          {action}
        </header>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[17px] font-semibold tracking-tight text-text-hi">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[12px] text-text-dim">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- buttons */

const VARIANTS = {
  primary: "bg-text-hi text-shell-950 hover:bg-white disabled:bg-shell-800 disabled:text-text-faint",
  secondary: "bg-shell-850 text-text-hi hover:bg-shell-800 disabled:text-text-faint",
  ghost: "text-text-dim hover:bg-shell-850 hover:text-text-hi",
  ok: "bg-ok-500/15 text-ok-400 hover:bg-ok-500/25 disabled:text-text-faint",
  danger: "text-bad-400 hover:bg-bad-500/10 disabled:text-text-faint",
} as const;

const SIZES = {
  sm: "h-7 px-2.5 text-[11px]",
  md: "h-8 px-3 text-[12px]",
  lg: "h-10 px-4 text-[12px]",
} as const;

type ButtonProps = {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------- status */

const STATUS_STYLE: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warn-500/12 text-warn-400 ring-warn-500/25" },
  confirmed: { label: "Confirmed", className: "bg-ok-500/12 text-ok-400 ring-ok-500/25" },
  cancelled: { label: "Cancelled", className: "bg-bad-500/12 text-bad-400 ring-bad-500/25" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.className}`}
    >
      {s.label}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "ok" | "bad";
}) {
  const tones = {
    neutral: "bg-shell-800 text-text-dim",
    accent: "bg-accent-500/12 text-accent-400",
    ok: "bg-ok-500/12 text-ok-400",
    bad: "bg-bad-500/12 text-bad-400",
  };
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- states */

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold text-text-hi">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[13px] text-text-dim">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-bad-500/30 bg-bad-500/10 px-3 py-2 text-[12px] text-bad-400"
    >
      {children}
    </p>
  );
}

/* ---------------------------------------------------------------- format */

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
