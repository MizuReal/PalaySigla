// Marketplace messaging data access — port of website/src/services/messaging.ts.
// Conversations are listing-scoped buyer/seller threads; reads and writes ride
// the anon key + participant RLS, and live updates arrive through Supabase
// Realtime channels. Messages are append-only (no update/delete paths).
import { supabase } from './supabaseClient'
import type { ConversationRow, ConversationSummary, MessageRow } from '../types/domain'

export const MESSAGE_MAX_CHARS = 2000
export const MESSAGE_PREVIEW_CHARS = 140

const PAGE_SIZE_DEFAULT = 20

export type ConversationRole = 'buyer' | 'seller'

export interface ConversationsPage {
  data: ConversationSummary[] | null
  total: number
}

export interface MessagesPage {
  data: MessageRow[] | null
  total: number
}

export interface FetchConversationsParams {
  page?: number
  limit?: number
}

export interface FetchMessagesParams {
  conversationId: string
  page?: number
  limit?: number
}

export interface StartConversationInput {
  listingId: string
  listingTitle: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
}

export interface SendMessageInput {
  conversationId: string
  senderId: string
  body: string
}

interface UnreadCountRow {
  conversation_id: string
  unread_count: number
}

export function getConversationRole(
  conversation: ConversationRow,
  userId: string
): ConversationRole {
  return conversation.buyer_id === userId ? 'buyer' : 'seller'
}

export async function fetchConversations(
  userId: string,
  { page = 1, limit = PAGE_SIZE_DEFAULT }: FetchConversationsParams = {}
): Promise<ConversationsPage> {
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('conversations')
    .select('*', { count: 'exact' })
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: true })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) {
    throw new Error('Could not load your messages. Please try again.')
  }
  const conversations = (data ?? []) as ConversationRow[]
  const unreadCounts = await fetchUnreadCounts()
  return {
    data: conversations.map((conversation) => ({
      ...conversation,
      unreadCount: unreadCounts.get(conversation.id) ?? 0,
    })),
    total: count ?? 0,
  }
}

export async function fetchUnreadCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('unread_message_counts')
  if (error) {
    throw new Error('Could not load your messages. Please try again.')
  }
  const rows = (data ?? []) as UnreadCountRow[]
  return new Map(rows.map((row) => [row.conversation_id, row.unread_count]))
}

export async function getConversation(conversationId: string): Promise<ConversationRow> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()
  if (error) {
    throw new Error('That conversation could not be found.')
  }
  return data as ConversationRow
}

// buyer candidates for a listing's reserve/sold picker; RLS narrows this to
// the caller's own participant threads
export async function fetchListingConversations(
  listingId: string
): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('listing_id', listingId)
    .order('last_message_at', { ascending: false, nullsFirst: true })
    .order('created_at', { ascending: false })
  if (error) {
    throw new Error('Could not load buyers for this listing. Please try again.')
  }
  return (data ?? []) as ConversationRow[]
}

export async function getOrCreateConversation({
  listingId,
  listingTitle,
  buyerId,
  buyerName,
  sellerId,
  sellerName,
}: StartConversationInput): Promise<ConversationRow> {
  const existing = await supabase
    .from('conversations')
    .select('*')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .maybeSingle()
  if (existing.error) {
    throw new Error('Could not open the conversation. Please try again.')
  }
  if (existing.data) {
    return existing.data as ConversationRow
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
      listing_title: listingTitle,
      buyer_id: buyerId,
      buyer_name: buyerName,
      seller_id: sellerId,
      seller_name: sellerName,
    })
    .select('*')
    .single()
  if (error) {
    // a concurrent create can win the (listing_id, buyer_id) unique index;
    // re-read rather than surfacing a duplicate-key failure to the buyer
    const retry = await supabase
      .from('conversations')
      .select('*')
      .eq('listing_id', listingId)
      .eq('buyer_id', buyerId)
      .maybeSingle()
    if (!retry.error && retry.data) {
      return retry.data as ConversationRow
    }
    throw new Error('Could not open the conversation. Please try again.')
  }
  return data as ConversationRow
}

export async function fetchMessages({
  conversationId,
  page = 1,
  limit = PAGE_SIZE_DEFAULT,
}: FetchMessagesParams): Promise<MessagesPage> {
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) {
    throw new Error('Could not load the conversation. Please try again.')
  }
  // fetch newest-first for pagination, then hand the page back oldest-first so
  // the thread renders top to bottom
  const messages = ((data ?? []) as MessageRow[]).slice().reverse()
  return { data: messages, total: count ?? 0 }
}

export async function sendMessage({
  conversationId,
  senderId,
  body,
}: SendMessageInput): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: body.trim(),
    })
    .select('*')
    .single()
  if (error) {
    throw new Error('Could not send the message. Please try again.')
  }
  return data as MessageRow
}

export async function markConversationRead(
  conversationId: string,
  role: ConversationRole
): Promise<void> {
  const readAt = new Date().toISOString()
  const patch =
    role === 'buyer'
      ? { buyer_last_read_at: readAt }
      : { seller_last_read_at: readAt }
  const { error } = await supabase
    .from('conversations')
    .update(patch)
    .eq('id', conversationId)
  if (error) {
    throw new Error('Could not update the conversation. Please try again.')
  }
}

export function subscribeToInbox(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`inbox:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${userId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'conversations', filter: `seller_id=eq.${userId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${userId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `seller_id=eq.${userId}` },
      onChange
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: MessageRow) => void
): () => void {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new as MessageRow)
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
