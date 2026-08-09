import { ChartSkeleton, KpiRowSkeleton, PageHeaderSkeleton, PanelSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <KpiRowSkeleton />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <ChartSkeleton />
        <PanelSkeleton lines={6} />
      </div>
    </>
  );
}
