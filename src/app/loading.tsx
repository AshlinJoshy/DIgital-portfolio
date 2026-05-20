export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-5 w-24 rounded bg-muted animate-pulse" />
        <div className="h-9 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="surface p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-7 w-32 rounded bg-muted animate-pulse" />
            <div className="h-2 w-full rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="surface p-6 h-[300px] animate-pulse" />
    </div>
  );
}
