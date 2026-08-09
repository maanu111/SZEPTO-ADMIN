/**
 * Route-level loading states.
 *
 * Next streams these in the moment a navigation starts, so a click always
 * produces immediate feedback instead of a frozen page.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

export function PageHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <Bar className="h-5 w-36" />
      {action && <Bar className="h-8 w-28 rounded-lg" />}
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <Bar className="h-8 w-full max-w-[15rem] rounded-lg" />
      <Bar className="h-6 w-40 rounded-md" />
      <Bar className="h-6 w-32 rounded-md" />
    </div>
  );
}

export function TableSkeleton({ rows = 8, thumb = true }: { rows?: number; thumb?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-shell-900">
      <div className="border-b border-line-soft px-4 py-2.5">
        <Bar className="h-3 w-24" />
      </div>
      <div className="divide-y divide-line-soft">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            {thumb && <Bar className="h-9 w-9 shrink-0 rounded-lg" />}
            <div className="min-w-0 flex-1">
              <Bar className="h-3 w-[38%]" />
              <Bar className="mt-1.5 h-2.5 w-[22%]" />
            </div>
            <Bar className="hidden h-3 w-20 sm:block" />
            <Bar className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PanelSkeleton({ lines = 4, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-shell-900 ${className}`}>
      <div className="border-b border-line-soft px-4 py-3">
        <Bar className="h-3 w-28" />
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        {Array.from({ length: lines }, (_, i) => (
          <Bar key={i} className="h-8 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-line bg-shell-900 p-4">
          <Bar className="h-2.5 w-20" />
          <Bar className="mt-2.5 h-6 w-24" />
          <Bar className="mt-1.5 h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-shell-900">
      <div className="border-b border-line-soft px-4 py-3">
        <Bar className="h-3 w-20" />
      </div>
      <div className="p-4">
        <Bar className="h-6 w-28" />
        {/* Varied heights read as a chart rather than a solid block */}
        <div className="mt-4 flex h-40 items-end gap-1.5">
          {["h-1/3", "h-1/2", "h-2/5", "h-3/4", "h-1/4", "h-3/5", "h-full", "h-1/2", "h-2/3", "h-1/3", "h-4/5", "h-2/5", "h-3/5", "h-1/2"].map(
            (h, i) => (
              <Bar key={i} className={`flex-1 ${h}`} />
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-4">
        <PanelSkeleton lines={6} />
        <PanelSkeleton lines={3} />
      </div>
      <div className="flex flex-col gap-4">
        <PanelSkeleton lines={2} />
        <Bar className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
