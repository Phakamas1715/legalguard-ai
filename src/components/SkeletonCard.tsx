const SkeletonCard = () => (
  <div className="bg-card border border-border rounded-2xl p-5 md:p-6 animate-pulse">
    <div className="flex items-center gap-2 mb-3">
      <div className="h-5 w-16 bg-muted rounded-full" />
      <div className="h-4 w-20 bg-muted rounded" />
      <div className="h-4 w-24 bg-muted rounded" />
    </div>
    <div className="h-5 w-3/4 bg-muted rounded mb-2" />
    <div className="space-y-2 mb-3">
      <div className="h-3 w-full bg-muted rounded" />
      <div className="h-3 w-5/6 bg-muted rounded" />
      <div className="h-3 w-2/3 bg-muted rounded" />
    </div>
    <div className="flex gap-1.5 mb-3">
      <div className="h-5 w-20 bg-muted rounded-md" />
      <div className="h-5 w-24 bg-muted rounded-md" />
    </div>
    <div className="h-1 bg-muted rounded-full mt-4" />
  </div>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default SkeletonCard;
