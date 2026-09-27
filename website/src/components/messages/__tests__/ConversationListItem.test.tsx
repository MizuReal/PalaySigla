import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ConversationListItem from '../ConversationListItem'
import type { ConversationSummary } from '../../../types/domain'

const CONVERSATION = {
  id: 'c1',
  buyer_id: 'u-viewer',
  seller_id: 'u-seller',
  buyer_name: 'Juan Cruz',
  seller_name: 'Maria Santos',
  listing_id: 'l1',
  listing_title: 'Palay harvest',
  last_message_at: '2026-09-01T00:00:00Z',
  last_message_preview: 'Is this still available?',
  unreadCount: 2,
} as unknown as ConversationSummary

describe('ConversationListItem', () => {
  it('shows the counterpart, role tag, avatar, listing, preview, and unread badge', () => {
    render(
      <ConversationListItem
        conversation={CONVERSATION}
        viewerId="u-viewer"
        isActive={false}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByText('Maria Santos')).toBeTruthy()
    expect(screen.getByText('Seller')).toBeTruthy()
    expect(screen.getByText('MS')).toBeTruthy()
    expect(screen.getByText('Palay harvest')).toBeTruthy()
    expect(screen.getByText('Is this still available?')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('opens the conversation when selected', () => {
    const onSelect = vi.fn()
    render(
      <ConversationListItem
        conversation={CONVERSATION}
        viewerId="u-viewer"
        isActive={false}
        onSelect={onSelect}
      />
    )

    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('c1')
  })
})
