/** Inline icon set — no icon dependency in the bundle. */
type P = { className?: string; strokeWidth?: number };
const base = "h-full w-full";
const stroke = (w = 1.7) => ({
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: w,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const DashIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="3" y="3" width="7.5" height="9" rx="2" {...stroke(strokeWidth)} />
    <rect x="13.5" y="3" width="7.5" height="5.5" rx="2" {...stroke(strokeWidth)} />
    <rect x="13.5" y="12" width="7.5" height="9" rx="2" {...stroke(strokeWidth)} />
    <rect x="3" y="15.5" width="7.5" height="5.5" rx="2" {...stroke(strokeWidth)} />
  </svg>
);

export const OrdersIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4v-17Z" {...stroke(strokeWidth)} />
    <path d="M9.5 8.5h5M9.5 12h5" {...stroke(strokeWidth)} />
  </svg>
);

export const BoxIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M12 3 3.5 7.2v9.6L12 21l8.5-4.2V7.2L12 3Z" {...stroke(strokeWidth)} />
    <path d="M3.5 7.2 12 11.5l8.5-4.3M12 11.5V21" {...stroke(strokeWidth)} />
  </svg>
);

export const GridIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" {...stroke(strokeWidth)} />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" {...stroke(strokeWidth)} />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" {...stroke(strokeWidth)} />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" {...stroke(strokeWidth)} />
  </svg>
);

export const QrIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" {...stroke(strokeWidth)} />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" {...stroke(strokeWidth)} />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" {...stroke(strokeWidth)} />
    <path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 20.5h2.5M20.5 14v2.5" {...stroke(strokeWidth)} />
  </svg>
);

export const TruckIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M2.5 6.5h11v9h-11zM13.5 10h4l3 3v2.5h-7z" {...stroke(strokeWidth)} />
    <circle cx="6.5" cy="17.5" r="1.8" {...stroke(strokeWidth)} />
    <circle cx="17" cy="17.5" r="1.8" {...stroke(strokeWidth)} />
  </svg>
);

export const SearchIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="11" cy="11" r="7" {...stroke(strokeWidth ?? 1.9)} />
    <path d="m20 20-3.5-3.5" {...stroke(strokeWidth ?? 1.9)} />
  </svg>
);

export const CheckIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7" {...stroke(strokeWidth ?? 2.4)} />
  </svg>
);

export const CloseIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" {...stroke(strokeWidth ?? 1.9)} />
  </svg>
);

export const PlusIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M12 5v14M5 12h14" {...stroke(strokeWidth ?? 2)} />
  </svg>
);

export const TrashIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m3 0-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7"
      {...stroke(strokeWidth)}
    />
  </svg>
);

export const ChevronDown = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="m6 9 6 6 6-6" {...stroke(strokeWidth ?? 2)} />
  </svg>
);

export const ChevronLeft = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="m15 5-7 7 7 7" {...stroke(strokeWidth ?? 2)} />
  </svg>
);

export const ChevronRight = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="m9 5 7 7-7 7" {...stroke(strokeWidth ?? 2)} />
  </svg>
);

export const LogoutIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" {...stroke(strokeWidth)} />
    <path d="M11 8 7 12l4 4M7 12h9" {...stroke(strokeWidth)} />
  </svg>
);

export const MenuIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" {...stroke(strokeWidth ?? 1.9)} />
  </svg>
);

export const BoltIcon = ({ className = base }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M13 2 4.5 13.2h5.8L10 22l9-11.4h-5.9L13 2Z" fill="currentColor" />
  </svg>
);

export const RupeeIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M7 4h10M7 8.5h10M7 4c5.5 0 5.5 8 0 8h2l7 8" {...stroke(strokeWidth)} />
  </svg>
);

export const AlertIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M12 3.5 21 19.5H3L12 3.5Z" {...stroke(strokeWidth)} />
    <path d="M12 10v4M12 17h.01" {...stroke(strokeWidth ?? 2)} />
  </svg>
);

export const ExternalIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M14 4h6v6M20 4l-8.5 8.5" {...stroke(strokeWidth)} />
    <path d="M18 14v5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h5" {...stroke(strokeWidth)} />
  </svg>
);

export const UploadIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M12 16V4m0 0L8 8m4-4 4 4" {...stroke(strokeWidth)} />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" {...stroke(strokeWidth)} />
  </svg>
);

export const TableIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" {...stroke(strokeWidth)} />
    <path d="M3.5 9.5h17M9 9.5V19.5M14.5 9.5V19.5" {...stroke(strokeWidth)} />
  </svg>
);

export const DocIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M6 3.5h7L18.5 9v11.5A1 1 0 0 1 17.5 21h-11a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" {...stroke(strokeWidth)} />
    <path d="M13 3.5V9h5.5M8.5 13h7M8.5 16.5h4" {...stroke(strokeWidth)} />
  </svg>
);

export const DownloadIcon = ({ className = base, strokeWidth }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M12 4v11m0 0 4-4m-4 4-4-4" {...stroke(strokeWidth)} />
    <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" {...stroke(strokeWidth)} />
  </svg>
);
