import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import DataTable from '../DataTable'
import type { HistoryColumn } from '../../utils/historyTable'

interface Row {
  id: string
  name: string
  price: number
}

const ROWS: Row[] = [
  { id: '1', name: 'Fresh palay', price: 1200 },
  { id: '2', name: 'Dried palay', price: 950 },
]

const COLUMNS: HistoryColumn<Row>[] = [
  {
    id: 'name',
    accessorFn: (row) => row.name,
    header: 'Name',
    enableSorting: false,
    cell: ({ row }) => row.original.name,
  },
  {
    id: 'price',
    accessorFn: (row) => row.price,
    header: 'Price',
    sortDescFirst: false,
    meta: { sortLabel: 'Price' },
    cell: ({ row }) => `PHP ${row.original.price}`,
  },
]

interface RenderOptions {
  data?: Row[]
  rowCount?: number
  isInitialLoading?: boolean
  isPageLoading?: boolean
  onRowClick?: (row: Row) => void
}

function renderTable({
  data = ROWS,
  rowCount = 25,
  isInitialLoading = false,
  isPageLoading = false,
  onRowClick,
}: RenderOptions = {}) {
  const onSortingChange = vi.fn()
  const onPaginationChange = vi.fn()
  render(
    <DataTable
      ariaLabel="History"
      columns={COLUMNS}
      data={data}
      rowKey={(row) => row.id}
      sorting={[]}
      onSortingChange={onSortingChange}
      pagination={{ pageIndex: 0, pageSize: 12 }}
      onPaginationChange={onPaginationChange}
      rowCount={rowCount}
      isInitialLoading={isInitialLoading}
      isPageLoading={isPageLoading}
      emptyState={<p>Nothing here</p>}
      renderMobileRow={(row) => <p>Mobile {row.name}</p>}
      onRowClick={onRowClick}
    />
  )
  return { onSortingChange, onPaginationChange }
}

function applyUpdater<T>(updater: unknown, current: T): T {
  return typeof updater === 'function'
    ? (updater as (old: T) => T)(current)
    : (updater as T)
}

describe('DataTable', () => {
  it('renders the column headers and rows from the column definitions', () => {
    renderTable()

    const table = screen.getByRole('table', { name: 'History' })
    expect(within(table).getByText('Name')).toBeTruthy()
    expect(within(table).getByText('Price')).toBeTruthy()
    expect(within(table).getByText('Fresh palay')).toBeTruthy()
    expect(within(table).getByText('PHP 1200')).toBeTruthy()
    expect(screen.getByText('Mobile Dried palay')).toBeTruthy()
  })

  it('emits the next sorting state when a sortable header is clicked', () => {
    const { onSortingChange } = renderTable()

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Price' }))

    expect(onSortingChange).toHaveBeenCalledTimes(1)
    const next = applyUpdater(onSortingChange.mock.calls[0][0], [])
    expect(next).toEqual([{ id: 'price', desc: false }])
  })

  it('does not render a sort control for unsortable columns', () => {
    renderTable()

    expect(screen.queryByRole('button', { name: 'Sort by Name' })).toBeNull()
  })

  it('reports the row window and pages through the server-side result', () => {
    const { onPaginationChange } = renderTable()

    expect(screen.getByText('Showing 1–12 of 25')).toBeTruthy()
    expect(screen.getByText('Page 1 of 3')).toBeTruthy()

    const prev = screen.getByRole('button', { name: 'Prev' })
    expect((prev as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    const next = applyUpdater(onPaginationChange.mock.calls[0][0], {
      pageIndex: 0,
      pageSize: 12,
    })
    expect(next).toEqual({ pageIndex: 1, pageSize: 12 })
  })

  it('opens a row only when a row click handler is provided', () => {
    const onRowClick = vi.fn()
    renderTable({ onRowClick })

    const table = screen.getByRole('table', { name: 'History' })
    fireEvent.click(within(table).getByText('Fresh palay'))

    expect(onRowClick).toHaveBeenCalledWith(ROWS[0])
  })

  it('renders the empty state without pagination when there are no rows', () => {
    renderTable({ data: [], rowCount: 0 })

    expect(screen.getAllByText('Nothing here').length).toBeGreaterThan(0)
    expect(screen.queryByText(/Showing/)).toBeNull()
  })

  it('shows skeleton rows instead of data while loading initially', () => {
    renderTable({ isInitialLoading: true })

    expect(screen.queryByText('Fresh palay')).toBeNull()
    expect(screen.queryByText('Mobile Fresh palay')).toBeNull()
  })

  it('keeps the rows mounted and marks the body busy during a page load', () => {
    const { container } = render(
      <DataTable
        ariaLabel="History"
        columns={COLUMNS}
        data={ROWS}
        rowKey={(row) => row.id}
        sorting={[]}
        onSortingChange={vi.fn()}
        pagination={{ pageIndex: 1, pageSize: 12 }}
        onPaginationChange={vi.fn()}
        rowCount={25}
        isInitialLoading={false}
        isPageLoading
        emptyState={<p>Nothing here</p>}
        renderMobileRow={(row) => <p>Mobile {row.name}</p>}
      />
    )

    expect(screen.getByText('Fresh palay')).toBeTruthy()
    expect(container.querySelector('tbody')?.getAttribute('aria-busy')).toBe('true')
  })
})
