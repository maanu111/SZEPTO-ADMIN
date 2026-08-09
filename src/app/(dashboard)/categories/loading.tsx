import { PageHeaderSkeleton, PanelSkeleton, TableSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <TableSkeleton rows={8} />
        <PanelSkeleton lines={5} />
      </div>
    </>
  );
}
