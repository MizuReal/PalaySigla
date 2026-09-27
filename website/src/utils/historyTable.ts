import {
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table'
import type { ColumnDef, PaginationState, RowData } from '@tanstack/react-table'

const DEFAULT_PAGE_SIZE = 12

export interface HistoryColumnMeta {
  align?: 'left' | 'right'
  /** Accessible name for the sort control; defaults to the column id. */
  sortLabel?: string
  headerClassName?: string
  cellClassName?: string
}

// Features are opt-in in TanStack Table v9; profile history sorting and
// pagination run on the server, so no client row models are registered.
export const HISTORY_TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnMeta: {} as HistoryColumnMeta,
})

export type HistoryColumn<TData extends RowData> = ColumnDef<
  typeof HISTORY_TABLE_FEATURES,
  TData
>

export function createHistoryPagination(pageSize = DEFAULT_PAGE_SIZE): PaginationState {
  return { pageIndex: 0, pageSize }
}
