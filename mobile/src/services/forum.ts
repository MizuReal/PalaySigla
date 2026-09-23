// Community forum data access — port of website/src/services/forum.ts. Reads
// ride the anon key + RLS (visible posts/comments and their photos); writes
// rely on owner-scoped policies. Photo bytes are uploaded from the compressed
// image's base64 payload (React Native cannot reliably read a local file), the
// same path as listings.
import { supabase } from './supabaseClient'
import { getSignedImageUrl } from './signedUrlCache'
import { decodePreparedImage } from '../utils/image'
import { FORUM_CATEGORIES, isForumCategory } from '../utils/forumCategories'
import type { PreparedImage } from '../utils/image'
import type { ForumCategory } from '../utils/forumCategories'
import type {
  ForumCommentItem,
  ForumCommentRow,
  ForumImageRef,
  ForumPostSummary,
  ForumPostWithImages,
} from '../types/domain'

export { FORUM_CATEGORIES, isForumCategory }
export type { ForumCategory }

const PAGE_SIZE_DEFAULT = 10

export const FORUM_MAX_IMAGES = 4
export const FORUM_IMAGE_BUCKET = 'forum'

export type ForumCategoryCounts = Record<ForumCategory, number>

export interface FetchForumPostsParams {
  category?: ForumCategory | null
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
  category: ForumCategory
}

export interface UpdateForumPostInput {
  postId: string
  title: string
  body: string
  category: ForumCategory
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

export interface UploadForumImageInput {
  image: PreparedImage
  postId: string
  userId: string
  position: number
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
  category = null,
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
    .select('*, forum_images(id, storage_path, position)', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'forum_images', ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  if (normalizedSearch) {
    query = query.or(
      `title.ilike.%${normalizedSearch}%,body.ilike.%${normalizedSearch}%`
    )
  }

  const { data, error, count } = await query.range(from, to)
  if (error) {
    throw new Error('Could not load discussions. Please try again.')
  }
  const posts = (data ?? []) as ForumPostWithImages[]
  const heartedIds = await fetchMyPostHeartIds(
    userId,
    posts.map((post) => post.id)
  )
  return {
    data: posts.map((post) => ({ ...post, hasHearted: heartedIds.has(post.id) })),
    total: count ?? 0,
  }
}

function createEmptyCategoryCounts(): ForumCategoryCounts {
  return FORUM_CATEGORIES.reduce((counts, category) => {
    counts[category] = 0
    return counts
  }, {} as ForumCategoryCounts)
}

export async function fetchForumCategoryCounts(): Promise<ForumCategoryCounts> {
  const { data, error } = await supabase.rpc('forum_category_counts')
  if (error) {
    throw new Error('Could not load categories. Please try again.')
  }
  const counts = createEmptyCategoryCounts()
  for (const row of data ?? []) {
    // the CHECK constraint guarantees the union; rows outside it are ignored
    if (isForumCategory(row.category)) {
      counts[row.category] = row.post_count
    }
  }
  return counts
}

export async function getForumPost(
  postId: string,
  userId: string | null = null
): Promise<ForumPostSummary> {
  const { data, error } = await supabase
    .from('forum_posts')
    .select('*, forum_images(id, storage_path, position)')
    .eq('id', postId)
    .is('deleted_at', null)
    .order('position', { referencedTable: 'forum_images', ascending: true })
    .single()
  if (error) {
    throw new Error('That discussion could not be found.')
  }
  const post = data as ForumPostWithImages
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
  category,
}: CreateForumPostInput): Promise<string> {
  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      user_id: userId,
      author_name: authorName,
      title: title.trim(),
      body: body.trim(),
      category,
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
  category,
}: UpdateForumPostInput): Promise<void> {
  const { error } = await supabase
    .from('forum_posts')
    .update({ title: title.trim(), body: body.trim(), category })
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

export async function markForumPostEdited(postId: string): Promise<void> {
  // explicit stamp: the content trigger only fires on title/body/category
  const { error } = await supabase
    .from('forum_posts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', postId)
  if (error) {
    throw new Error('Could not save the changes. Please try again.')
  }
}

export async function uploadForumImage({
  image,
  postId,
  userId,
  position,
}: UploadForumImageInput): Promise<ForumImageRef> {
  const storagePath = `${userId}/${postId}/${position}.jpg`
  const bytes = decodePreparedImage(image)
  const { error: uploadError } = await supabase.storage
    .from(FORUM_IMAGE_BUCKET)
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false })
  if (uploadError) {
    throw new Error('Could not upload the photo. Please try again.')
  }
  const { data, error } = await supabase
    .from('forum_images')
    .insert({ post_id: postId, storage_path: storagePath, position })
    .select('id')
    .single()
  if (error) {
    throw new Error('Could not save the photo. Please try again.')
  }
  return { id: data.id, storage_path: storagePath, position }
}

export async function deleteForumImage(image: ForumImageRef): Promise<void> {
  const { error } = await supabase.from('forum_images').delete().eq('id', image.id)
  if (error) {
    throw new Error('Could not remove the photo. Please try again.')
  }
  // the row is the source of truth; the object is best-effort cleanup
  await supabase.storage.from(FORUM_IMAGE_BUCKET).remove([image.storage_path])
}

export async function getForumImageUrl(storagePath: string): Promise<string> {
  return getSignedImageUrl(FORUM_IMAGE_BUCKET, storagePath, 'Could not load the photo.')
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
