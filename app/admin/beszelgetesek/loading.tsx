import { Skeleton } from "../ui";

export default function Loading() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
      <Skeleton className="h-9 w-[260px]" />
      <Skeleton className="mt-3 h-5 w-[160px]" />
      <Skeleton className="mt-6 h-[46px] w-full" />
      <div className="card mt-6 divide-y divide-line">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-5">
            <Skeleton className="h-5 w-[180px]" />
            <Skeleton className="mt-2.5 h-4 w-full max-w-[420px]" />
            <Skeleton className="mt-2 h-3 w-[120px]" />
          </div>
        ))}
      </div>
    </main>
  );
}
