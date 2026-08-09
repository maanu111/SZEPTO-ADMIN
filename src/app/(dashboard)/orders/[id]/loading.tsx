import { PageHeaderSkeleton, PanelSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton action={false} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4">
          <PanelSkeleton lines={5} />
          <PanelSkeleton lines={3} />
        </div>
        <div className="flex flex-col gap-4">
          <PanelSkeleton lines={3} />
          <PanelSkeleton lines={3} />
        </div>
      </div>
    </>
  );
}
