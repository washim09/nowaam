export default function Loading() {
  return (
    <div className="section-shell py-10">
      <div className="space-y-6">
        <div className="surface-elevated p-6">
          <div className="shimmer h-8 w-32 rounded-full bg-brand-100" />
          <div className="mt-4 shimmer h-16 max-w-2xl rounded-[28px] bg-brand-100" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="surface-card overflow-hidden">
              <div className="shimmer h-48 bg-brand-100" />
              <div className="space-y-3 p-4">
                <div className="shimmer h-4 rounded-full bg-brand-100" />
                <div className="shimmer h-4 w-2/3 rounded-full bg-brand-100" />
                <div className="shimmer h-10 rounded-2xl bg-brand-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
