/// <reference types="jest" />
import {
  createChannelMock,
  createQueryBuilder,
  resetSupabaseMock,
} from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

import type { ChannelMock, SupabaseMock } from '../../test/supabaseMock'
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
  jest.restoreAllMocks()
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
      data: [{ conversation_id: 'c1', unread_count: 2 }],
      error: null,
    })
    const counts = await fetchUnreadCounts()
    expect(counts.get('c1')).toBe(2)
  })
})

describe('getConversation', () => {
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
  })

  it('inserts a new thread when none exists', async () => {
    const selectBuilder = createQueryBuilder({ data: null, error: null })
    const insertBuilder = createQueryBuilder({ data: CONVERSATION, error: null })
    supabase.from.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(insertBuilder)

    await getOrCreateConversation({
      listingId: 'l1',
      listingTitle: 'Palay harvest',
      buyerId: 'buyer',
      buyerName: 'Bata Buyer',
      sellerId: 'seller',
      sellerName: 'Mang Seller',
    })

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ listing_id: 'l1', buyer_id: 'buyer', seller_id: 'seller' })
    )
  })
})

describe('fetchMessages', () => {
  it('returns the page oldest-first', async () => {
    const newer = { ...MESSAGE, id: 'm2', created_at: '2026-08-25T12:01:00Z' }
    const builder = createQueryBuilder({ data: [newer, MESSAGE], error: null, count: 2 })
    supabase.from.mockReturnValue(builder)

    const result = await fetchMessages({ conversationId: 'c1' })

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
})

describe('markConversationRead', () => {
  it('stamps the correct participant watermark', async () => {
    const buyerBuilder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(buyerBuilder)
    await markConversationRead('c1', 'buyer')
    expect(buyerBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ buyer_last_read_at: expect.any(String) })
    )

    const sellerBuilder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(sellerBuilder)
    await markConversationRead('c1', 'seller')
    expect(sellerBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ seller_last_read_at: expect.any(String) })
    )
  })
})

describe('subscribeToConversation', () => {
  it('binds the thread filter and forwards incoming rows', () => {
    const onMessage = jest.fn()
    const unsubscribe = subscribeToConversation('c1', onMessage)

    const channel = supabase.channel.mock.results[0].value as ChannelMock
    channel.handlers[0].callback({ new: MESSAGE })
    expect(onMessage).toHaveBeenCalledWith(MESSAGE)

    unsubscribe()
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel)
  })
})

describe('subscribeToInbox', () => {
  it('binds both participant roles and unsubscribes cleanly', () => {
    const onChange = jest.fn()
    const channel = createChannelMock()
    supabase.channel.mockReturnValue(channel)

    const unsubscribe = subscribeToInbox('buyer', onChange)

    expect(channel.handlers).toHaveLength(4)
    channel.handlers[0].callback()
    expect(onChange).toHaveBeenCalledTimes(1)

    unsubscribe()
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel)
  })
})
