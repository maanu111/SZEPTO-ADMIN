import { FormSkeleton, PageHeaderSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton action={false} />
      <FormSkeleton />
    </>
  );
}
