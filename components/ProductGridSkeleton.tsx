export function ProductGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="surface-card overflow-hidden">
          <div className="shimmer h-44 w-full bg-brand-100" />
          <div className="space-y-3 p-4">
            <div className="shimmer h-4 rounded-full bg-brand-100" />
            <div className="shimmer h-4 w-2/3 rounded-full bg-brand-100" />
            <div className="shimmer h-10 rounded-2xl bg-brand-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
