import { useCallback, useEffect, useMemo, useState } from 'react'
import { functionalUpdate } from '@tanstack/react-table'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import DataTable from '../DataTable'
import ListingDetailModal from '../marketplace/ListingDetailModal'
import ReviewAction from './ReviewAction'
import ReviewFormModal from './ReviewFormModal'
import StatusChip from './StatusChip'
import { useAuth } from '../../context/authContext'
import useMyListings, { MY_LISTINGS_PAGE_SIZE } from '../../hooks/useMyListings'
import useMyReviewedTransactionIds from '../../hooks/useMyReviewedTransactionIds'
import {
  getListingImageUrl,
  getLiveTransaction,
  MY_LISTING_FILTERS,
  MY_LISTING_SORTS,
} from '../../services/listings'
import type { MyListingFilter, MyListingSort } from '../../services/listings'
import { CATEGORY_LABELS, formatDate, formatPrice, UNIT_LABELS } from '../../utils/format'
import { createHistoryPagination } from '../../utils/historyTable'
import type { HistoryColumn } from '../../utils/historyTable'
import { HISTORY_STATUSES } from '../../utils/historyStatus'
import type { HistoryStatus } from '../../utils/historyStatus'
import { pillTabClasses } from '../../utils/pillTab'
import { getDisplayName } from '../../utils/userProfile'
import type { MyListingWithTransaction, TransactionRow } from '../../types/domain'

interface HistoryFilter {
  id: MyListingFilter
  label: string
}

const HISTORY_FILTERS: readonly HistoryFilter[] = Object.freeze([
  { id: MY_LISTING_FILTERS.ALL, label: 'All' },
  { id: MY_LISTING_FILTERS.ACTIVE, label: 'Active' },
  { id: MY_LISTING_FILTERS.RESERVED, label: 'Reserved' },
  { id: MY_LISTING_FILTERS.SOLD, label: 'Sold' },
  { id: MY_LISTING_FILTERS.DELETED, label: 'Deleted' },
])

const EMPTY_MESSAGES: Record<MyListingFilter, string> = Object.freeze({
  [MY_LISTING_FILTERS.ALL]:
    'You have not listed anything yet. Post your harvest from the marketplace and it will show up here.',
  [MY_LISTING_FILTERS.ACTIVE]:
    'No active listings right now. Post one from the marketplace.',
  [MY_LISTING_FILTERS.RESERVED]:
    'No reserved listings. Reserve one for a buyer and it will show up here.',
  [MY_LISTING_FILTERS.SOLD]:
    'Nothing sold yet. Mark a listing as sold and it will show up here.',
  [MY_LISTING_FILTERS.DELETED]:
    'No removed listings. Listings you remove stay here for your records.',
})

function createDefaultSorting(): SortingState {
  return [{ id: 'listed', desc: true }]
}

function toMyListingSort(sorting: SortingState): MyListingSort {
  const [sort] = sorting
  if (!sort) {
    return MY_LISTING_SORTS.NEWEST
  }
  if (sort.id === 'price') {
    return sort.desc ? MY_LISTING_SORTS.PRICE_DESC : MY_LISTING_SORTS.PRICE_ASC
  }
  return sort.desc ? MY_LISTING_SORTS.NEWEST : MY_LISTING_SORTS.OLDEST
}

function resolveStatus(listing: MyListingWithTransaction): HistoryStatus {
  if (listing.deleted_at) {
    return HISTORY_STATUSES.DELETED
  }
  if (listing.status === 'sold') {
    return HISTORY_STATUSES.SOLD
  }
  return listing.status === 'reserved'
    ? HISTORY_STATUSES.RESERVED
    : HISTORY_STATUSES.ACTIVE
}

interface TransactionSummary {
  label: string
  date: string
}

function transactionSummary(listing: MyListingWithTransaction): TransactionSummary | null {
  if (listing.status === 'sold' && listing.sold_to_name) {
    return { label: `Sold to ${listing.sold_to_name}`, date: listing.sold_at ?? '' }
  }
  if (listing.status === 'reserved' && listing.reserved_for_name) {
    return {
      label: `Reserved for ${listing.reserved_for_name}`,
      date: listing.reserved_at ?? '',
    }
  }
  return null
}

function HistoryThumbnail({ storagePath, title }: { storagePath: string; title: string }) {
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      if (!storagePath) {
        return
      }
      try {
        const url = await getListingImageUrl(storagePath)
        if (isCurrent) {
          setImageUrl(url)
        }
      } catch {
        // the surface-soft placeholder below covers a failed photo
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [storagePath])

  if (!imageUrl) {
    return (
      <div
        aria-hidden="true"
        className="aspect-[4/3] w-16 shrink-0 border border-hairline bg-surface-soft"
      />
    )
  }

  return (
    <img
      src={imageUrl}
      alt={title}
      loading="lazy"
      className="aspect-[4/3] w-16 shrink-0 border border-hairline object-cover"
    />
  )
}

function ListingCell({ listing }: { listing: MyListingWithTransaction }) {
  const image = listing.listing_images?.[0]
  return (
    <div className="flex min-w-0 items-center gap-3">
      <HistoryThumbnail storagePath={image?.storage_path ?? ''} title={listing.title} />
      <div className="min-w-0">
        <p className="card-title truncate text-ink">{listing.title}</p>
        <p className="caption-sm mt-0.5 text-mute">{CATEGORY_LABELS[listing.category]}</p>
      </div>
    </div>
  )
}

function PriceCell({ listing }: { listing: MyListingWithTransaction }) {
  if (listing.price === null) {
    return <span className="caption-sm text-mute">&mdash;</span>
  }
  return (
    <p className="whitespace-nowrap">
      <span className="body-strong text-primary">{formatPrice(listing.price)}</span>{' '}
      <span className="caption-sm text-mute">{UNIT_LABELS[listing.unit]}</span>
    </p>
  )
}

function TransactionCell({ listing }: { listing: MyListingWithTransaction }) {
  const summary = transactionSummary(listing)
  if (!summary) {
    return <span className="caption-sm text-mute">&mdash;</span>
  }
  return (
    <div className="min-w-0">
      <p className="body-sm truncate text-ink">{summary.label}</p>
      {summary.date && (
        <p className="caption-sm mt-0.5 text-mute">{formatDate(summary.date)}</p>
      )}
    </div>
  )
}

interface ManageActionProps {
  listing: MyListingWithTransaction
  onSelect: (listing: MyListingWithTransaction) => void
}

function ManageAction({ listing, onSelect }: ManageActionProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onSelect(listing)
      }}
      className="inline-flex h-10 items-center whitespace-nowrap rounded-sm border border-hairline bg-canvas px-3 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
    >
      Manage
    </button>
  )
}

interface HistoryTableProps {
  userId: string
  filter: MyListingFilter
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  refreshKey: number
  onSelectListing: (listing: MyListingWithTransaction) => void
  onReview: (transaction: TransactionRow) => void
  reviewed: Set<string>
}

function HistoryTable({
  userId,
  filter,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  refreshKey,
  onSelectListing,
  onReview,
  reviewed,
}: HistoryTableProps) {
  const sort = toMyListingSort(sorting)
  const { listings, total, isInitialLoading, isPageLoading, error, retry } =
    useMyListings({
      userId,
      filter,
      sort,
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      refreshKey,
    })

  const columns = useMemo<HistoryColumn<MyListingWithTransaction>[]>(
    () => [
      {
        id: 'listing',
        accessorFn: (listing) => listing.title,
        header: 'Listing',
        enableSorting: false,
        meta: { headerClassName: 'w-[30%]' },
        cell: ({ row }) => <ListingCell listing={row.original} />,
      },
      {
        id: 'status',
        accessorFn: (listing) => resolveStatus(listing),
        header: 'Status',
        enableSorting: false,
        meta: { headerClassName: 'w-[11%]' },
        cell: ({ row }) => <StatusChip status={resolveStatus(row.original)} />,
      },
      {
        id: 'price',
        accessorFn: (listing) => listing.price ?? 0,
        header: 'Price',
        sortDescFirst: false,
        meta: { headerClassName: 'w-[14%]', sortLabel: 'Price' },
        cell: ({ row }) => <PriceCell listing={row.original} />,
      },
      {
        id: 'listed',
        accessorFn: (listing) => listing.created_at,
        header: 'Listed',
        sortDescFirst: true,
        meta: { headerClassName: 'w-[13%]', sortLabel: 'Listing date' },
        cell: ({ row }) => (
          <span className="caption-sm whitespace-nowrap text-mute">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'transaction',
        accessorFn: (listing) => transactionSummary(listing)?.label ?? '',
        header: 'Transaction',
        enableSorting: false,
        meta: { headerClassName: 'w-[19%]' },
        cell: ({ row }) => <TransactionCell listing={row.original} />,
      },
      {
        id: 'actions',
        header: 'Action',
        enableSorting: false,
        meta: { align: 'right', headerClassName: 'w-[13%]' },
        cell: ({ row }) => {
          const listing = row.original
          const transaction = getLiveTransaction(listing)
          if (transaction && transaction.status === 'sold' && transaction.buyer_id) {
            return (
              <ReviewAction
                transaction={transaction}
                hasReviewed={reviewed.has(transaction.id)}
                onReview={onReview}
              />
            )
          }
          if (listing.deleted_at) {
            return <span className="caption-sm text-mute">&mdash;</span>
          }
          return <ManageAction listing={listing} onSelect={onSelectListing} />
        },
      },
    ],
    [onReview, onSelectListing, reviewed]
  )

  const renderMobileRow = useCallback(
    (listing: MyListingWithTransaction) => {
      const status = resolveStatus(listing)
      const transaction = getLiveTransaction(listing)
      const summary = transactionSummary(listing)
      const isDeleted = status === HISTORY_STATUSES.DELETED
      const content = (
        <div className="flex items-start gap-3">
          <HistoryThumbnail
            storagePath={listing.listing_images?.[0]?.storage_path ?? ''}
            title={listing.title}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="card-title min-w-0 truncate text-ink">{listing.title}</p>
              <StatusChip status={status} />
            </div>
            <p className="mt-1">
              {listing.price === null ? (
                <span className="caption-sm text-mute">Price not set</span>
              ) : (
                <>
                  <span className="body-strong text-primary">
                    {formatPrice(listing.price)}
                  </span>{' '}
                  <span className="caption-sm text-mute">{UNIT_LABELS[listing.unit]}</span>
                </>
              )}
            </p>
            <p className="caption-sm mt-1 text-mute">
              {CATEGORY_LABELS[listing.category]} &middot; Listed{' '}
              {formatDate(listing.created_at)}
            </p>
            {summary && (
              <p className="caption-sm mt-1 text-ink">
                {summary.label}
                {summary.date ? ` \u00b7 ${formatDate(summary.date)}` : ''}
              </p>
            )}
          </div>
        </div>
      )
      return (
        <div className="border-b border-hairline p-4 last:border-b-0">
          {isDeleted ? (
            content
          ) : (
            <button
              type="button"
              onClick={() => onSelectListing(listing)}
              className="w-full text-left"
            >
              {content}
            </button>
          )}
          <div className="mt-3 flex justify-end">
            {transaction && transaction.status === 'sold' && transaction.buyer_id ? (
              <ReviewAction
                transaction={transaction}
                hasReviewed={reviewed.has(transaction.id)}
                onReview={onReview}
              />
            ) : (
              !isDeleted && <ManageAction listing={listing} onSelect={onSelectListing} />
            )}
          </div>
        </div>
      )
    },
    [onReview, onSelectListing, reviewed]
  )

  if (error) {
    return (
      <div className="p-8 text-center" role="alert">
        <p className="body-strong text-ink">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-4 h-11 border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <DataTable
      bordered={false}
      ariaLabel="Selling history"
      columns={columns}
      data={listings}
      rowKey={(listing) => listing.id}
      sorting={sorting}
      onSortingChange={onSortingChange}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      rowCount={total}
      isInitialLoading={isInitialLoading}
      isPageLoading={isPageLoading}
      onRowClick={onSelectListing}
      isRowDisabled={(listing) => listing.deleted_at !== null}
      emptyState={
        <p className="body-sm p-8 text-center text-body">{EMPTY_MESSAGES[filter]}</p>
      }
      renderMobileRow={renderMobileRow}
    />
  )
}

interface SellingHistoryPanelProps {
  onSelectListing?: (listing: MyListingWithTransaction) => void
}

function SellingHistoryPanel({ onSelectListing }: SellingHistoryPanelProps) {
  const { user } = useAuth()
  const [filter, setFilter] = useState<MyListingFilter>(MY_LISTING_FILTERS.ALL)
  const [sorting, setSorting] = useState<SortingState>(createDefaultSorting)
  const [pagination, setPagination] = useState<PaginationState>(() =>
    createHistoryPagination(MY_LISTINGS_PAGE_SIZE)
  )
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [reviewTarget, setReviewTarget] = useState<TransactionRow | null>(null)
  const reviewed = useMyReviewedTransactionIds(user?.id ?? null)

  const resetToFirstPage = useCallback(() => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }, [])

  const handleFilterChange = useCallback(
    (nextFilter: MyListingFilter) => {
      setFilter(nextFilter)
      resetToFirstPage()
    },
    [resetToFirstPage]
  )

  const handleSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      setSorting((current) => functionalUpdate(updater, current))
      resetToFirstPage()
    },
    [resetToFirstPage]
  )

  const handleChanged = useCallback(() => {
    setRefreshNonce((current) => current + 1)
    resetToFirstPage()
  }, [resetToFirstPage])

  if (!user) {
    return null
  }

  const handleSelect = (listing: MyListingWithTransaction) => {
    if (onSelectListing) {
      onSelectListing(listing)
      return
    }
    setSelectedListingId(listing.id)
  }

  return (
    <section className="border border-hairline bg-canvas" aria-label="Selling history">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <h2 className="heading-sm text-ink">Selling history</h2>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter listings by status"
        >
          {HISTORY_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => handleFilterChange(option.id)}
              className={pillTabClasses(filter === option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <HistoryTable
        userId={user.id}
        filter={filter}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        pagination={pagination}
        onPaginationChange={setPagination}
        refreshKey={refreshNonce}
        onSelectListing={handleSelect}
        onReview={setReviewTarget}
        reviewed={reviewed}
      />
      {selectedListingId && (
        <ListingDetailModal
          key={selectedListingId}
          listingId={selectedListingId}
          onClose={() => setSelectedListingId(null)}
          onChanged={handleChanged}
        />
      )}
      {reviewTarget && (
        <ReviewFormModal
          transaction={reviewTarget}
          viewerId={user.id}
          viewerName={getDisplayName(user)}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </section>
  )
}

export default SellingHistoryPanel
