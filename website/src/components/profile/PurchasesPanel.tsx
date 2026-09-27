import { formatDate, formatPrice, UNIT_LABELS } from '../../utils/format'
import useMyPurchases from '../../hooks/useMyPurchases'
import { useAuth } from '../../context/authContext'
import type { TransactionRow } from '../../types/domain'

const SKELETON_COUNT = 3

const STATUS_LABELS: Record<string, string> = Object.freeze({
  reserved: 'Reserved',
  sold: 'Sold',
})

function purchaseDate(transaction: TransactionRow): string {
  return transaction.sold_at ?? transaction.reserved_at ?? transaction.created_at
}

function PurchasesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-start gap-4 border border-hairline bg-canvas p-4"
        >
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-5 w-2/3 bg-surface-soft" />
            <div className="h-4 w-1/3 bg-surface-soft" />
            <div className="h-3 w-4/5 bg-surface-soft" />
          </div>
        </div>
      ))}
    </div>
  )
}

function PurchasesPanel() {
  const { user } = useAuth()
  const {
    purchases,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore,
  } = useMyPurchases(user?.id)

  if (!user) {
    return null
  }

  const renderList = () => {
    if (isInitialLoading) {
      return <PurchasesSkeleton />
    }
    if (error) {
      return (
        <div className="border border-error bg-surface-soft p-8 text-center" role="alert">
          <p className="body-strong text-ink">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 border border-hairline bg-canvas px-4 py-2.5 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
          >
            Try again
          </button>
        </div>
      )
    }
    if (purchases.length === 0) {
      return (
        <div className="border border-hairline bg-surface-soft p-8 text-center">
          <p className="body-sm text-body">
            Nothing yet. When a seller reserves or sells you a listing, it will
            show up here so you can keep track and leave a review.
          </p>
        </div>
      )
    }
    return (
      <>
        <div className="space-y-3">
          {purchases.map((transaction) => (
            <article
              key={transaction.id}
              className="border border-hairline bg-canvas p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="card-title text-ink">{transaction.listing_title}</span>
                <span className="rounded-sm border border-hairline bg-surface-soft px-3 py-1">
                  <span className="caption-md text-ink">
                    {STATUS_LABELS[transaction.status] ?? transaction.status}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-ink">
                <span className="heading-sm text-primary">
                  {formatPrice(transaction.price ?? 0)}
                </span>{' '}
                <span className="caption-sm text-mute">
                  {UNIT_LABELS[transaction.unit]}
                </span>
              </p>
              <p className="caption-sm mt-1 text-mute">
                Seller {transaction.seller_name} · {formatDate(purchaseDate(transaction))}
              </p>
            </article>
          ))}
        </div>
        {hasMore && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="h-11 border border-hairline bg-canvas px-6 button-md text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
            >
              {isLoadingMore ? 'Loading more…' : 'Load more'}
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <section className="border border-hairline bg-canvas p-6 md:p-8">
      <h2 className="heading-sm text-ink">Purchases</h2>
      <p className="body-sm mt-2 text-mute">
        Listings a seller has reserved or sold to you.
      </p>
      <div className="mt-6">{renderList()}</div>
    </section>
  )
}

export default PurchasesPanel
