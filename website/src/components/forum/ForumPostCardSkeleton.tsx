function ForumPostCardSkeleton() {
  return (
    <div className="border border-hairline bg-canvas p-6">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 animate-pulse rounded-full bg-surface-soft" />
        <div className="h-3 w-40 animate-pulse bg-surface-soft" />
      </div>
      <div className="mt-4 h-5 w-2/3 animate-pulse bg-surface-soft" />
      <div className="mt-3 h-3 w-full animate-pulse bg-surface-soft" />
      <div className="mt-2 h-3 w-4/5 animate-pulse bg-surface-soft" />
    </div>
  )
}

export default ForumPostCardSkeleton
