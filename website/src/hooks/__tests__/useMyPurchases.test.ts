import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/transactions', () => ({
  fetchMyPurchases: vi.fn(),
  TRANSACTION_SORTS: {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    PRICE_ASC: 'price_asc',
    PRICE_DESC: 'price_desc',
  },
}))

import { fetchMyPurchases } from '../../services/transactions'
import type { TransactionsPage } from '../../services/transactions'
import type { TransactionRow } from '../../types/domain'
import useMyPurchases from '../useMyPurchases'

function page(data: { id: string }[], total: number): TransactionsPage {
  return { data: data as unknown as TransactionRow[], total }
}

const fetchMyPurchasesMock = vi.mocked(fetchMyPurchases)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useMyPurchases', () => {
  it('loads the requested page and sort', async () => {
    fetchMyPurchasesMock.mockResolvedValue(page([{ id: 't1' }], 30))

    const { result } = renderHook(() =>
      useMyPurchases({ userId: 'u1', sort: 'price_desc', page: 3 })
    )

    expect(result.current.isInitialLoading).toBe(true)
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(fetchMyPurchases).toHaveBeenCalledWith('u1', {
      sort: 'price_desc',
      page: 3,
      limit: 12,
    })
    expect(result.current.purchases).toEqual([{ id: 't1' }])
    expect(result.current.total).toBe(30)
  })

  it('clears state without a user id', async () => {
    const { result } = renderHook(() => useMyPurchases())

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))
    expect(fetchMyPurchases).not.toHaveBeenCalled()
    expect(result.current.purchases).toEqual([])
  })

  it('surfaces failures and retries', async () => {
    fetchMyPurchasesMock
      .mockRejectedValueOnce(new Error('Could not load your purchases. Please try again.'))
      .mockResolvedValueOnce(page([{ id: 't1' }], 1))

    const { result } = renderHook(() => useMyPurchases({ userId: 'u1' }))
    await waitFor(() =>
      expect(result.current.error).toBe(
        'Could not load your purchases. Please try again.'
      )
    )

    act(() => {
      result.current.retry()
    })

    await waitFor(() => expect(result.current.error).toBe(''))
    expect(result.current.purchases).toEqual([{ id: 't1' }])
  })
})
