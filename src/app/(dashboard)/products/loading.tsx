import { FilterBarSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton rows={10} />
    </>
  );
}
