import { PageHeaderSkeleton, PanelSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton action={false} />
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <PanelSkeleton lines={4} />
        <PanelSkeleton lines={5} />
      </div>
    </>
  );
}
