import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  createChannelMock,
  createQueryBuilder,
  resetSupabaseMock,
} from '../../test/supabaseMock'
import type { ChannelMock, SupabaseMock } from '../../test/supabaseMock'

vi.mock('../supabaseClient', async () => {
  const { createSupabaseMock } = await import('../../test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase as supabaseClient } from '../supabaseClient'
import {
  fetchConversations,
  fetchMessages,
  fetchUnreadCounts,
  getConversation,
  getConversationRole,
  getOrCreateConversation,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
  subscribeToInbox,
} from '../messaging'
import type { ConversationRow, MessageRow } from '../../types/domain'

const supabase = supabaseClient as unknown as SupabaseMock

const CONVERSATION: ConversationRow = {
  id: 'c1',
  listing_id: 'l1',
  listing_title: 'Palay harvest',
  buyer_id: 'buyer',
  seller_id: 'seller',
  buyer_name: 'Bata Buyer',
  seller_name: 'Mang Seller',
  last_message_at: null,
  last_message_preview: null,
  buyer_last_read_at: null,
  seller_last_read_at: null,
  created_at: '2026-08-25T12:00:00Z',
  updated_at: null,
}

const MESSAGE: MessageRow = {
  id: 'm1',
  conversation_id: 'c1',
  sender_id: 'buyer',
  body: 'Magkano po?',
  created_at: '2026-08-25T12:00:00Z',
}

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getConversationRole', () => {
  it('identifies the buyer and falls back to seller otherwise', () => {
    expect(getConversationRole(CONVERSATION, 'buyer')).toBe('buyer')
    expect(getConversationRole(CONVERSATION, 'seller')).toBe('seller')
  })
})

describe('fetchConversations', () => {
  it('scopes to the viewer and attaches unread counts', async () => {
    const builder = createQueryBuilder({ data: [CONVERSATION], error: null, count: 1 })
    supabase.from.mockReturnValue(builder)
    supabase.rpc.mockResolvedValue({
      data: [{ conversation_id: 'c1', unread_count: 3 }],
      error: null,
    })

    const result = await fetchConversations('buyer')

    expect(supabase.from).toHaveBeenCalledWith('conversations')
    expect(builder.or).toHaveBeenCalledWith('buyer_id.eq.buyer,seller_id.eq.buyer')
    expect(supabase.rpc).toHaveBeenCalledWith('unread_message_counts')
    expect(result.total).toBe(1)
    expect(result.data?.[0].unreadCount).toBe(3)
  })

  it('throws a friendly error when the query fails', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))
    await expect(fetchConversations('buyer')).rejects.toThrow(
      'Could not load your messages. Please try again.'
    )
  })
})

describe('fetchUnreadCounts', () => {
  it('maps RPC rows to a conversation-id lookup', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        { conversation_id: 'c1', unread_count: 2 },
        { conversation_id: 'c2', unread_count: 0 },
      ],
      error: null,
    })
    const counts = await fetchUnreadCounts()
    expect(counts.get('c1')).toBe(2)
    expect(counts.get('c2')).toBe(0)
  })
})

describe('getConversation', () => {
  it('returns the row for the id', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: CONVERSATION, error: null }))
    await expect(getConversation('c1')).resolves.toEqual(CONVERSATION)
  })

  it('throws when the conversation is missing', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'none' } }))
    await expect(getConversation('c1')).rejects.toThrow('That conversation could not be found.')
  })
})

describe('getOrCreateConversation', () => {
  it('returns an existing thread without inserting', async () => {
    const selectBuilder = createQueryBuilder({ data: CONVERSATION, error: null })
    supabase.from.mockReturnValue(selectBuilder)

    const conversation = await getOrCreateConversation({
      listingId: 'l1',
      listingTitle: 'Palay harvest',
      buyerId: 'buyer',
      buyerName: 'Bata Buyer',
      sellerId: 'seller',
      sellerName: 'Mang Seller',
    })

    expect(conversation).toEqual(CONVERSATION)
    expect(selectBuilder.eq).toHaveBeenCalledWith('listing_id', 'l1')
    expect(selectBuilder.eq).toHaveBeenCalledWith('buyer_id', 'buyer')
  })

  it('inserts a new thread when none exists', async () => {
    const selectBuilder = createQueryBuilder({ data: null, error: null })
    const insertBuilder = createQueryBuilder({ data: CONVERSATION, error: null })
    supabase.from.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(insertBuilder)

    const conversation = await getOrCreateConversation({
      listingId: 'l1',
      listingTitle: 'Palay harvest',
      buyerId: 'buyer',
      buyerName: 'Bata Buyer',
      sellerId: 'seller',
      sellerName: 'Mang Seller',
    })

    expect(conversation).toEqual(CONVERSATION)
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ listing_id: 'l1', buyer_id: 'buyer', seller_id: 'seller' })
    )
  })
})

describe('fetchMessages', () => {
  it('fetches newest-first but returns the page oldest-first', async () => {
    const newer = { ...MESSAGE, id: 'm2', created_at: '2026-08-25T12:01:00Z' }
    const builder = createQueryBuilder({ data: [newer, MESSAGE], error: null, count: 2 })
    supabase.from.mockReturnValue(builder)

    const result = await fetchMessages({ conversationId: 'c1' })

    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result.data?.map((message) => message.id)).toEqual(['m1', 'm2'])
    expect(result.total).toBe(2)
  })
})

describe('sendMessage', () => {
  it('trims the body and returns the stored row', async () => {
    const builder = createQueryBuilder({ data: MESSAGE, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(
      sendMessage({ conversationId: 'c1', senderId: 'buyer', body: '  Magkano po?  ' })
    ).resolves.toEqual(MESSAGE)
    expect(builder.insert).toHaveBeenCalledWith({
      conversation_id: 'c1',
      sender_id: 'buyer',
      body: 'Magkano po?',
    })
  })

  it('throws a friendly error on failure', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))
    await expect(
      sendMessage({ conversationId: 'c1', senderId: 'buyer', body: 'hi' })
    ).rejects.toThrow('Could not send the message. Please try again.')
  })
})

describe('markConversationRead', () => {
  it('stamps the buyer watermark for buyers', async () => {
    const builder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(builder)

    await markConversationRead('c1', 'buyer')

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ buyer_last_read_at: expect.any(String) })
    )
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1')
  })

  it('stamps the seller watermark for sellers', async () => {
    const builder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(builder)

    await markConversationRead('c1', 'seller')

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ seller_last_read_at: expect.any(String) })
    )
  })
})

describe('subscribeToConversation', () => {
  it('binds the thread filter and forwards incoming rows', () => {
    const onMessage = vi.fn()
    const unsubscribe = subscribeToConversation('c1', onMessage)

    const channel = supabase.channel.mock.results[0].value as ChannelMock
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.c1' },
      expect.any(Function)
    )

    channel.handlers[0].callback({ new: MESSAGE })
    expect(onMessage).toHaveBeenCalledWith(MESSAGE)

    unsubscribe()
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel)
  })
})

describe('subscribeToInbox', () => {
  it('binds both participant roles and unsubscribes cleanly', () => {
    const onChange = vi.fn()
    const channel = createChannelMock()
    supabase.channel.mockReturnValue(channel)

    const unsubscribe = subscribeToInbox('buyer', onChange)

    expect(channel.handlers).toHaveLength(4)
    expect(channel.handlers.map((handler) => handler.config)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'conversations', filter: 'buyer_id=eq.buyer' }),
        expect.objectContaining({ table: 'conversations', filter: 'seller_id=eq.buyer' }),
      ])
    )

    channel.handlers[0].callback()
    expect(onChange).toHaveBeenCalledTimes(1)

    unsubscribe()
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel)
  })
})
