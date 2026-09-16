import { supabase } from './supabaseClient'
import type {
  ForumCommentItem,
  ForumCommentRow,
  ForumPostRow,
  ForumPostSummary,
} from '../types/domain'

const PAGE_SIZE_DEFAULT = 10

export interface FetchForumPostsParams {
  search?: string
  page?: number
  limit?: number
  userId?: string | null
}

export interface FetchForumCommentsParams {
  postId: string
  page?: number
  limit?: number
  userId?: string | null
}

export interface ForumPostsPage {
  data: ForumPostSummary[] | null
  total: number
}

export interface ForumCommentsPage {
  data: ForumCommentItem[] | null
  total: number
}

export interface CreateForumPostInput {
  userId: string
  authorName: string
  title: string
  body: string
}

export interface UpdateForumPostInput {
  postId: string
  title: string
  body: string
}

export interface CreateForumCommentInput {
  postId: string
  userId: string
  authorName: string
  body: string
}

export interface UpdateForumCommentInput {
  commentId: string
  body: string
}

// one reaction row per user per post; the row type keeps the FK columns
// nullable, so the service narrows them at the boundary
interface HeartIdRow {
  post_id?: string | null
  comment_id?: string | null
}

export async function fetchMyPostHeartIds(
  userId: string | null,
  postIds: string[]
): Promise<Set<string>> {
  if (!userId || postIds.length === 0) {
    return new Set()
  }
  const { data, error } = await supabase
    .from('forum_reactions')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds)
  if (error) {
    throw new Error('Could not load reactions. Please try again.')
  }
  const rows = (data ?? []) as HeartIdRow[]
  return new Set(rows.flatMap((row) => (row.post_id ? [row.post_id] : [])))
}

export async function fetchMyCommentHeartIds(
  userId: string | null,
  commentIds: string[]
): Promise<Set<string>> {
  if (!userId || commentIds.length === 0) {
    return new Set()
  }
  const { data, error } = await supabase
    .from('forum_reactions')
    .select('comment_id')
    .eq('user_id', userId)
    .in('comment_id', commentIds)
  if (error) {
    throw new Error('Could not load reactions. Please try again.')
  }
  const rows = (data ?? []) as HeartIdRow[]
  return new Set(rows.flatMap((row) => (row.comment_id ? [row.comment_id] : [])))
}

export async function fetchForumPosts({
  search = '',
  page = 1,
  limit = PAGE_SIZE_DEFAULT,
  userId = null,
}: FetchForumPostsParams = {}): Promise<ForumPostsPage> {
  const normalizedSearch = search.trim()
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('forum_posts')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (normalizedSearch) {
    query = query.or(
      `title.ilike.%${normalizedSearch}%,body.ilike.%${normalizedSearch}%`
    )
  }

  const { data, error, count } = await query.range(from, to)
  if (error) {
    throw new Error('Could not load discussions. Please try again.')
  }
  const posts = (data ?? []) as ForumPostRow[]
  const heartedIds = await fetchMyPostHeartIds(
    userId,
    posts.map((post) => post.id)
  )
  return {
    data: posts.map((post) => ({ ...post, hasHearted: heartedIds.has(post.id) })),
    total: count ?? 0,
  }
}

export async function getForumPost(
  postId: string,
  userId: string | null = null
): Promise<ForumPostSummary> {
  const { data, error } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('id', postId)
    .is('deleted_at', null)
    .single()
  if (error) {
    throw new Error('That discussion could not be found.')
  }
  const post = data as ForumPostRow
  const heartedIds = await fetchMyPostHeartIds(userId, [post.id])
  return { ...post, hasHearted: heartedIds.has(post.id) }
}

export async function fetchForumComments({
  postId,
  page = 1,
  limit = PAGE_SIZE_DEFAULT,
  userId = null,
}: FetchForumCommentsParams): Promise<ForumCommentsPage> {
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('forum_comments')
    .select('*', { count: 'exact' })
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .range(from, to)
  if (error) {
    throw new Error('Could not load comments. Please try again.')
  }
  const comments = (data ?? []) as ForumCommentRow[]
  const heartedIds = await fetchMyCommentHeartIds(
    userId,
    comments.map((comment) => comment.id)
  )
  return {
    data: comments.map((comment) => ({
      ...comment,
      hasHearted: heartedIds.has(comment.id),
    })),
    total: count ?? 0,
  }
}

export async function createForumPost({
  userId,
  authorName,
  title,
  body,
}: CreateForumPostInput): Promise<string> {
  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      user_id: userId,
      author_name: authorName,
      title: title.trim(),
      body: body.trim(),
    })
    .select('id')
    .single()
  if (error) {
    throw new Error('Could not publish the discussion. Please try again.')
  }
  return data.id
}

export async function updateForumPost({
  postId,
  title,
  body,
}: UpdateForumPostInput): Promise<void> {
  const { error } = await supabase
    .from('forum_posts')
    .update({ title: title.trim(), body: body.trim() })
    .eq('id', postId)
  if (error) {
    throw new Error('Could not save the changes. Please try again.')
  }
}

export async function softDeleteForumPost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('forum_posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId)
  if (error) {
    throw new Error('Could not remove the discussion. Please try again.')
  }
}

export async function createForumComment({
  postId,
  userId,
  authorName,
  body,
}: CreateForumCommentInput): Promise<string> {
  const { data, error } = await supabase
    .from('forum_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      author_name: authorName,
      body: body.trim(),
    })
    .select('id')
    .single()
  if (error) {
    throw new Error('Could not post the comment. Please try again.')
  }
  return data.id
}

export async function updateForumComment({
  commentId,
  body,
}: UpdateForumCommentInput): Promise<void> {
  const { error } = await supabase
    .from('forum_comments')
    .update({ body: body.trim() })
    .eq('id', commentId)
  if (error) {
    throw new Error('Could not save the comment. Please try again.')
  }
}

export async function softDeleteForumComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('forum_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
  if (error) {
    throw new Error('Could not remove the comment. Please try again.')
  }
}

export async function setForumPostHeart(
  postId: string,
  userId: string,
  hearted: boolean
): Promise<void> {
  if (hearted) {
    const { error } = await supabase
      .from('forum_reactions')
      .insert({ post_id: postId, user_id: userId })
    if (error) {
      throw new Error('Could not add your heart. Please try again.')
    }
    return
  }
  const { error } = await supabase
    .from('forum_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
  if (error) {
    throw new Error('Could not remove your heart. Please try again.')
  }
}

export async function setForumCommentHeart(
  commentId: string,
  userId: string,
  hearted: boolean
): Promise<void> {
  if (hearted) {
    const { error } = await supabase
      .from('forum_reactions')
      .insert({ comment_id: commentId, user_id: userId })
    if (error) {
      throw new Error('Could not add your heart. Please try again.')
    }
    return
  }
  const { error } = await supabase
    .from('forum_reactions')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId)
  if (error) {
    throw new Error('Could not remove your heart. Please try again.')
  }
}
