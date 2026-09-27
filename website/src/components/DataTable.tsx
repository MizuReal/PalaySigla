import { useTable } from '@tanstack/react-table'
import type { OnChangeFn, PaginationState, RowData, SortingState } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import Icon from './Icon'
import { HISTORY_TABLE_FEATURES } from '../utils/historyTable'
import type { HistoryColumn } from '../utils/historyTable'

const SKELETON_ROW_COUNT = 5
const MOBILE_SKELETON_COUNT = 3

interface SortIndicatorProps {
  direction: 'asc' | 'desc' | false
}

function SortIndicator({ direction }: SortIndicatorProps) {
  if (direction === 'asc') {
    return <Icon name="chevron-up" className="h-3.5 w-3.5 shrink-0 text-primary" />
  }
  if (direction === 'desc') {
    return <Icon name="chevron-down" className="h-3.5 w-3.5 shrink-0 text-primary" />
  }
  return <Icon name="chevron-down" className="h-3.5 w-3.5 shrink-0 text-ash" />
}

interface DataTableProps<TData extends RowData> {
  ariaLabel: string
  columns: HistoryColumn<TData>[]
  data: TData[]
  rowKey: (row: TData) => string
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  rowCount: number
  isInitialLoading: boolean
  isPageLoading: boolean
  emptyState: ReactNode
  renderMobileRow: (row: TData) => ReactNode
  onRowClick?: (row: TData) => void
  isRowDisabled?: (row: TData) => boolean
  bordered?: boolean
}

function DataTable<TData extends RowData>({
  ariaLabel,
  columns,
  data,
  rowKey,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  rowCount,
  isInitialLoading,
  isPageLoading,
  emptyState,
  renderMobileRow,
  onRowClick,
  isRowDisabled,
  bordered = true,
}: DataTableProps<TData>) {
  const table = useTable({
    features: HISTORY_TABLE_FEATURES,
    columns,
    data,
    state: { sorting, pagination },
    onSortingChange,
    onPaginationChange,
    manualSorting: true,
    manualPagination: true,
    rowCount,
    enableSortingRemoval: false,
    enableMultiSort: false,
  })

  const pageCount = Math.max(table.getPageCount(), 1)
  const rowTotal = table.getRowCount()
  const pageIndex = pagination.pageIndex
  const pageSize = pagination.pageSize
  const firstRow = rowTotal === 0 ? 0 : pageIndex * pageSize + 1
  const lastRow = Math.min((pageIndex + 1) * pageSize, rowTotal)
  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows
  const isEmpty = !isInitialLoading && !isPageLoading && data.length === 0

  const renderHeaderCell = (
    header: (typeof headerGroups)[number]['headers'][number]
  ) => {
    const alignRight = header.column.columnDef.meta?.align === 'right'
    const direction = header.column.getIsSorted()
    const label = header.column.columnDef.meta?.sortLabel ?? header.column.id
    const content = (
      <>
        <table.FlexRender header={header} />
        {header.column.getCanSort() && <SortIndicator direction={direction} />}
      </>
    )
    const classes = `caption-md flex min-h-11 w-full items-center gap-1.5 px-4 text-ink ${
      alignRight ? 'justify-end' : 'justify-start'
    }`
    if (!header.column.getCanSort()) {
      return <span className={classes}>{content}</span>
    }
    return (
      <button
        type="button"
        onClick={header.column.getToggleSortingHandler()}
        className={`${classes} transition-colors hover:text-primary`}
        aria-label={`Sort by ${label}`}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={bordered ? 'border border-hairline bg-canvas' : 'bg-canvas'}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse" aria-label={ariaLabel}>
          <thead className="border-b border-hairline bg-surface-soft">
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const alignRight = header.column.columnDef.meta?.align === 'right'
                  const sortState = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sortState === 'asc'
                          ? 'ascending'
                          : sortState === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      className={`p-0 text-left ${
                        header.column.columnDef.meta?.headerClassName ?? ''
                      } ${alignRight ? 'text-right' : ''}`}
                    >
                      {header.isPlaceholder ? null : renderHeaderCell(header)}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody aria-busy={isPageLoading || undefined}>
            {isInitialLoading
              ? Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} className="border-b border-hairline">
                    {columns.map((_column, columnIndex) => (
                      <td key={columnIndex} className="px-4 py-3.5">
                        <div
                          className={`h-4 animate-pulse bg-surface-soft ${
                            columnIndex === 0 ? 'w-4/5' : 'w-2/3'
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => {
                  const disabled = isRowDisabled?.(row.original) ?? false
                  const clickable = onRowClick !== undefined && !disabled
                  return (
                    <tr
                      key={rowKey(row.original)}
                      onClick={clickable ? () => onRowClick(row.original) : undefined}
                      className={`border-b border-hairline transition-colors last:border-b-0 ${
                        clickable ? 'cursor-pointer hover:bg-surface-soft' : ''
                      } ${isPageLoading ? 'opacity-60' : ''}`}
                    >
                      {row.getAllCells().map((cell) => {
                        const alignRight = cell.column.columnDef.meta?.align === 'right'
                        return (
                          <td
                            key={cell.id}
                            className={`px-4 py-3 align-middle ${
                              cell.column.columnDef.meta?.cellClassName ?? ''
                            } ${alignRight ? 'text-right' : ''}`}
                          >
                            <table.FlexRender cell={cell} />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
          </tbody>
        </table>
        {isEmpty && <div className="border-t border-hairline">{emptyState}</div>}
      </div>

      <div className="md:hidden">
        {isInitialLoading ? (
          <div>
            {Array.from({ length: MOBILE_SKELETON_COUNT }, (_, index) => (
              <div
                key={`mobile-skeleton-${index}`}
                className="animate-pulse space-y-3 border-b border-hairline p-4 last:border-b-0"
              >
                <div className="h-4 w-2/3 bg-surface-soft" />
                <div className="h-3 w-1/3 bg-surface-soft" />
                <div className="h-3 w-4/5 bg-surface-soft" />
              </div>
            ))}
          </div>
        ) : rows.length > 0 ? (
          <div className={isPageLoading ? 'opacity-60' : ''}>
            {rows.map((row) => (
              <div key={rowKey(row.original)}>{renderMobileRow(row.original)}</div>
            ))}
          </div>
        ) : null}
        {isEmpty && emptyState}
      </div>

      {rowTotal > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3">
          <p className="caption-sm text-mute" aria-live="polite">
            Showing {firstRow}&ndash;{lastRow} of {rowTotal}
          </p>
          <div className="flex items-center gap-2">
            <span className="caption-sm text-mute">
              Page {pageIndex + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-11 border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-11 border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
