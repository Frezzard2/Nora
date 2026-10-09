import { Skeleton } from "./ui";

export default function Loading() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
      <Skeleton className="h-9 w-[200px]" />
      <Skeleton className="mt-6 h-[92px] w-full rounded-[14px]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[108px] rounded-[14px]" />
        ))}
      </div>
      <Skeleton className="mt-10 h-6 w-[220px]" />
      <Skeleton className="mt-4 h-[280px] w-full rounded-[14px]" />
    </main>
  );
}
