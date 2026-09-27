import { useCallback, useMemo, useState } from 'react'
import { functionalUpdate } from '@tanstack/react-table'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import DataTable from '../DataTable'
import ReviewAction from './ReviewAction'
import ReviewFormModal from './ReviewFormModal'
import StatusChip from './StatusChip'
import { useAuth } from '../../context/authContext'
import useMyPurchases, { MY_PURCHASES_PAGE_SIZE } from '../../hooks/useMyPurchases'
import useMyReviewedTransactionIds from '../../hooks/useMyReviewedTransactionIds'
import { TRANSACTION_SORTS } from '../../services/transactions'
import type { TransactionSort } from '../../services/transactions'
import { formatDate, formatPrice, UNIT_LABELS } from '../../utils/format'
import { createHistoryPagination } from '../../utils/historyTable'
import type { HistoryColumn } from '../../utils/historyTable'
import { HISTORY_STATUSES } from '../../utils/historyStatus'
import type { HistoryStatus } from '../../utils/historyStatus'
import { getDisplayName } from '../../utils/userProfile'
import type { TransactionRow } from '../../types/domain'

function createDefaultSorting(): SortingState {
  return [{ id: 'date', desc: true }]
}

const EMPTY_MESSAGE =
  'Nothing yet. When a seller reserves or sells you a listing, it will show up here so you can keep track and leave a review.'

function toTransactionSort(sorting: SortingState): TransactionSort {
  const [sort] = sorting
  if (!sort) {
    return TRANSACTION_SORTS.NEWEST
  }
  if (sort.id === 'price') {
    return sort.desc ? TRANSACTION_SORTS.PRICE_DESC : TRANSACTION_SORTS.PRICE_ASC
  }
  return sort.desc ? TRANSACTION_SORTS.NEWEST : TRANSACTION_SORTS.OLDEST
}

function resolveStatus(transaction: TransactionRow): HistoryStatus {
  return transaction.status === 'sold'
    ? HISTORY_STATUSES.SOLD
    : HISTORY_STATUSES.RESERVED
}

function purchaseDate(transaction: TransactionRow): string {
  return transaction.sold_at ?? transaction.reserved_at ?? transaction.created_at
}

function PriceCell({ transaction }: { transaction: TransactionRow }) {
  if (transaction.price === null) {
    return <span className="caption-sm text-mute">&mdash;</span>
  }
  return (
    <p className="whitespace-nowrap">
      <span className="body-strong text-primary">{formatPrice(transaction.price)}</span>{' '}
      <span className="caption-sm text-mute">{UNIT_LABELS[transaction.unit]}</span>
    </p>
  )
}

interface PurchasesTableProps {
  userId: string
  onReview: (transaction: TransactionRow) => void
  reviewed: Set<string>
}

function PurchasesTable({ userId, onReview, reviewed }: PurchasesTableProps) {
  const [sorting, setSorting] = useState<SortingState>(createDefaultSorting)
  const [pagination, setPagination] = useState<PaginationState>(() =>
    createHistoryPagination(MY_PURCHASES_PAGE_SIZE)
  )
  const sort = toTransactionSort(sorting)
  const { purchases, total, isInitialLoading, isPageLoading, error, retry } =
    useMyPurchases({
      userId,
      sort,
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
    })

  const pageCount = Math.max(Math.ceil(total / pagination.pageSize), 1)
  const isOutOfRange = pagination.pageIndex > pageCount - 1
  const effectivePagination = isOutOfRange
    ? { ...pagination, pageIndex: pageCount - 1 }
    : pagination

  const handleSortingChange: OnChangeFn<SortingState> = useCallback((updater) => {
    setSorting((current) => functionalUpdate(updater, current))
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }, [])

  const columns = useMemo<HistoryColumn<TransactionRow>[]>(
    () => [
      {
        id: 'listing',
        accessorFn: (transaction) => transaction.listing_title,
        header: 'Listing',
        enableSorting: false,
        meta: { headerClassName: 'w-[34%]' },
        cell: ({ row }) => (
          <p className="card-title truncate text-ink">{row.original.listing_title}</p>
        ),
      },
      {
        id: 'seller',
        accessorFn: (transaction) => transaction.seller_name,
        header: 'Seller',
        enableSorting: false,
        meta: { headerClassName: 'w-[20%]' },
        cell: ({ row }) => (
          <p className="body-sm truncate text-ink">{row.original.seller_name}</p>
        ),
      },
      {
        id: 'status',
        accessorFn: (transaction) => resolveStatus(transaction),
        header: 'Status',
        enableSorting: false,
        meta: { headerClassName: 'w-[12%]' },
        cell: ({ row }) => <StatusChip status={resolveStatus(row.original)} />,
      },
      {
        id: 'price',
        accessorFn: (transaction) => transaction.price ?? 0,
        header: 'Price',
        sortDescFirst: false,
        meta: { headerClassName: 'w-[15%]', sortLabel: 'Price' },
        cell: ({ row }) => <PriceCell transaction={row.original} />,
      },
      {
        id: 'date',
        accessorFn: (transaction) => purchaseDate(transaction),
        header: 'Date',
        sortDescFirst: true,
        meta: { headerClassName: 'w-[11%]', sortLabel: 'Transaction date' },
        cell: ({ row }) => (
          <span className="caption-sm whitespace-nowrap text-mute">
            {formatDate(purchaseDate(row.original))}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Action',
        enableSorting: false,
        meta: { align: 'right', headerClassName: 'w-[8%]' },
        cell: ({ row }) => (
          <ReviewAction
            transaction={row.original}
            hasReviewed={reviewed.has(row.original.id)}
            onReview={onReview}
          />
        ),
      },
    ],
    [onReview, reviewed]
  )

  const renderMobileRow = useCallback(
    (transaction: TransactionRow) => (
      <div className="border-b border-hairline p-4 last:border-b-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="card-title min-w-0 truncate text-ink">
            {transaction.listing_title}
          </p>
          <StatusChip status={resolveStatus(transaction)} />
        </div>
        <p className="mt-1">
          {transaction.price === null ? (
            <span className="caption-sm text-mute">Price not set</span>
          ) : (
            <>
              <span className="body-strong text-primary">
                {formatPrice(transaction.price)}
              </span>{' '}
              <span className="caption-sm text-mute">{UNIT_LABELS[transaction.unit]}</span>
            </>
          )}
        </p>
        <p className="caption-sm mt-1 text-mute">
          Seller {transaction.seller_name} &middot; {formatDate(purchaseDate(transaction))}
        </p>
        <div className="mt-3 flex justify-end">
          <ReviewAction
            transaction={transaction}
            hasReviewed={reviewed.has(transaction.id)}
            onReview={onReview}
          />
        </div>
      </div>
    ),
    [onReview, reviewed]
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
      ariaLabel="Purchases"
      columns={columns}
      data={purchases}
      rowKey={(transaction) => transaction.id}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      pagination={effectivePagination}
      onPaginationChange={setPagination}
      rowCount={total}
      isInitialLoading={isInitialLoading}
      isPageLoading={isPageLoading}
      emptyState={<p className="body-sm p-8 text-center text-body">{EMPTY_MESSAGE}</p>}
      renderMobileRow={renderMobileRow}
    />
  )
}

function PurchasesPanel() {
  const { user } = useAuth()
  const [reviewTarget, setReviewTarget] = useState<TransactionRow | null>(null)
  const reviewed = useMyReviewedTransactionIds(user?.id ?? null)

  if (!user) {
    return null
  }

  return (
    <section className="border border-hairline bg-canvas" aria-label="Purchases">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <h2 className="heading-sm text-ink">Purchases</h2>
      </div>
      <PurchasesTable
        userId={user.id}
        onReview={setReviewTarget}
        reviewed={reviewed}
      />
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

export default PurchasesPanel
