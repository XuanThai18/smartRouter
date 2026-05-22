export default function Loading() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* KPI skeletons */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[1,2,3,4].map(i=>(
          <div key={i} className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-[hsl(var(--bg-hover))] rounded animate-pulse"/>
              <div className="h-8 w-8 bg-[hsl(var(--bg-hover))] rounded animate-pulse"/>
            </div>
            <div className="h-8 w-20 bg-[hsl(var(--bg-hover))] rounded animate-pulse"/>
            <div className="h-3 w-32 bg-[hsl(var(--bg-hover))] rounded animate-pulse"/>
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="h-64 bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] animate-pulse"/>
      {/* Table skeleton */}
      <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] overflow-hidden">
        <div className="h-10 bg-[hsl(var(--bg-hover))] animate-pulse"/>
        {[1,2,3,4,5].map(i=>(
          <div key={i} className="h-12 border-t border-[hsl(var(--border-sub))] px-4 flex items-center gap-6">
            {[28,48,32,16,20].map((w,j)=>(
              <div key={j} className={`h-3 w-${w} bg-[hsl(var(--bg-hover))] rounded animate-pulse`}/>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
