import { PageHeaderSkeleton, PanelSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton action={false} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <PanelSkeleton lines={5} />
        <PanelSkeleton lines={4} />
      </div>
    </>
  );
}
