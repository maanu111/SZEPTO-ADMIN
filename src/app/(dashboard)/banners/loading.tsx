import { PageHeaderSkeleton, PanelSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-3">
        <PanelSkeleton lines={2} />
        <PanelSkeleton lines={2} />
        <PanelSkeleton lines={2} />
      </div>
    </>
  );
}
