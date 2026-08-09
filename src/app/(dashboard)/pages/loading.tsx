import { PageHeaderSkeleton, PanelSkeleton, TableSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton action={false} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <TableSkeleton rows={6} thumb={false} />
        <PanelSkeleton lines={5} />
      </div>
    </>
  );
}
