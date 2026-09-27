function ListingCardSkeleton() {
  return (
    <div className="border border-hairline bg-canvas shadow-card">
      <div className="relative">
        <div className="aspect-[4/3] animate-pulse bg-surface-soft" />
        <div className="absolute left-3 top-3 h-6 w-20 animate-pulse bg-surface-soft" />
      </div>
      <div className="space-y-2.5 p-4">
        <div className="h-4 w-3/4 animate-pulse bg-surface-soft" />
        <div className="h-5 w-1/3 animate-pulse bg-surface-soft" />
        <div className="h-3 w-1/2 animate-pulse bg-surface-soft" />
      </div>
    </div>
  )
}

export default ListingCardSkeleton
