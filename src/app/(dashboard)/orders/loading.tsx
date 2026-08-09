import { FilterBarSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton action={false} />
      <FilterBarSkeleton />
      <TableSkeleton rows={10} thumb={false} />
    </>
  );
}
