// Create/edit a discussion — the web PostEditorModal ported to a full-screen
// root-stack push (title, category pills, body, up to four photos). Validation
// focuses the first invalid field; create-then-upload rolls back on failure.
import { useRef, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Button from '../components/Button'
import Icon from '../components/Icon'
import ForumImageUploader from '../components/forum/ForumImageUploader'
import { useAuth } from '../context/authContext'
import useForumImagePicker from '../hooks/useForumImagePicker'
import useForumPost from '../hooks/useForumPost'
import useForumPostEditor from '../hooks/useForumPostEditor'
import {
  FORUM_CATEGORIES,
  FORUM_CATEGORY_LABELS,
} from '../utils/forumCategories'
import type { ForumCategory } from '../utils/forumCategories'
import { validateForumPost } from '../utils/forumValidation'
import type { ForumPostErrors } from '../utils/forumValidation'
import { notifyForumChanged } from '../utils/forumEvents'
import { COLORS, GUTTER, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../theme/designTokens'
import type { ForumPostSummary } from '../types/domain'
import type { RootStackParamList } from '../types/navigation'

const BODY_INPUT_HEIGHT = 160

interface ErrorBannerProps {
  message: string
}

function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <View accessibilityRole="alert" style={styles.errorBanner}>
      <Icon name="info" size={20} color={COLORS.error} />
      <Text style={[TYPE.bodySm, styles.errorBannerText]}>{message}</Text>
    </View>
  )
}

interface EditorBodyProps {
  post: ForumPostSummary | null
  onDone: () => void
}

function EditorBody({ post, onDone }: EditorBodyProps) {
  const { user } = useAuth()
  const { savePost, isSubmitting, error: saveError } = useForumPostEditor(post)
  const {
    newImages,
    removedImageIds,
    isProcessing,
    error: imageError,
    remainingSlots,
    addFromLibrary,
    removeNewImage,
    toggleExisting,
  } = useForumImagePicker(post?.forum_images ?? [])

  const [title, setTitle] = useState(post?.title ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [category, setCategory] = useState<ForumCategory>(post?.category ?? 'general')
  const [errors, setErrors] = useState<ForumPostErrors>({})
  const [serverError, setServerError] = useState('')

  const titleRef = useRef<TextInput>(null)
  const bodyRef = useRef<TextInput>(null)

  const clearError = (field: keyof ForumPostErrors) => {
    setErrors((current) => {
      if (!(field in current)) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const focusFirstError = (nextErrors: ForumPostErrors) => {
    if (nextErrors.title) {
      titleRef.current?.focus()
    } else if (nextErrors.body) {
      bodyRef.current?.focus()
    }
  }

  const handleSubmit = async () => {
    const nextErrors = validateForumPost({ title, body, category })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors)
      return
    }
    setServerError('')
    try {
      await savePost({ title, body, category, newImages, removedImageIds })
      notifyForumChanged()
      onDone()
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Could not save the discussion. Please try again.'
      )
    }
  }

  if (!user) {
    return (
      <View style={[styles.centered, { paddingBottom: SPACING.xxl }]}>
        <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.centeredText]}>
          Sign in to start a discussion.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={[TYPE.captionMd, styles.fieldLabel]}>Title</Text>
      <TextInput
        ref={titleRef}
        style={[styles.input, errors.title ? styles.inputError : null]}
        value={title}
        onChangeText={(value) => {
          setTitle(value)
          clearError('title')
        }}
        placeholder="What's on your mind?"
        placeholderTextColor={COLORS.stone}
        accessibilityLabel="Discussion title"
        maxLength={120}
      />
      {errors.title ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.title}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.fieldLabel]}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.pillScroller}
        contentContainerStyle={styles.pillRow}
      >
        {FORUM_CATEGORIES.map((option) => {
          const isActive = category === option
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={FORUM_CATEGORY_LABELS[option]}
              onPress={() => {
                setCategory(option)
                clearError('category')
              }}
              style={({ pressed }) => [
                styles.pill,
                isActive ? styles.pillActive : styles.pillInactive,
                pressed && !isActive && styles.pillPressed,
              ]}
            >
              <Text
                style={[
                  TYPE.buttonSm,
                  isActive ? styles.pillTextActive : styles.pillText,
                ]}
              >
                {FORUM_CATEGORY_LABELS[option]}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      {errors.category ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.category}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.fieldLabel]}>Details</Text>
      <TextInput
        ref={bodyRef}
        style={[
          styles.input,
          styles.bodyInput,
          errors.body ? styles.inputError : null,
        ]}
        value={body}
        onChangeText={(value) => {
          setBody(value)
          clearError('body')
        }}
        placeholder="Share the details…"
        placeholderTextColor={COLORS.stone}
        accessibilityLabel="Discussion body"
        multiline
        textAlignVertical="top"
        maxLength={5000}
      />
      {errors.body ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.body}
        </Text>
      ) : null}

      <View style={styles.photos}>
        <ForumImageUploader
          existingImages={post?.forum_images ?? []}
          removedImageIds={removedImageIds}
          newImages={newImages}
          remainingSlots={remainingSlots}
          isProcessing={isProcessing}
          error={imageError}
          onToggleExisting={toggleExisting}
          onAdd={addFromLibrary}
          onRemoveNew={removeNewImage}
        />
      </View>

      {saveError || serverError ? (
        <ErrorBanner message={serverError || saveError} />
      ) : null}

      <View style={styles.submit}>
        <Button
          label={post ? (isSubmitting ? 'Saving…' : 'Save changes') : isSubmitting ? 'Publishing…' : 'Publish discussion'}
          onPress={handleSubmit}
          disabled={isSubmitting}
          fullWidth
        />
      </View>
    </ScrollView>
  )
}

interface TopBarProps {
  topInset: number
  label: string
  onBack: () => void
  backDisabled?: boolean
}

function TopBar({ topInset, label, onBack, backDisabled = false }: TopBarProps) {
  return (
    <View style={[styles.topBar, { paddingTop: topInset + SPACING.sm }]}>
      <View style={styles.topBarRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityState={{ disabled: backDisabled }}
          disabled={backDisabled}
          onPress={onBack}
          hitSlop={SPACING.sm}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Icon name="chevron-left" size={24} color={COLORS.ink} />
        </Pressable>
        <Text style={[TYPE.captionMd, styles.topBarLabel]}>{label}</Text>
      </View>
    </View>
  )
}

interface PostLoaderProps {
  postId: string
  onDone: () => void
}

function EditLoader({ postId, onDone }: PostLoaderProps) {
  const { post, isLoading, error, refresh } = useForumPost(postId)

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={[TYPE.bodySm, styles.centeredText]}>Loading discussion…</Text>
      </View>
    )
  }
  if (error || !post) {
    return (
      <View style={styles.centered}>
        <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.centeredText]}>
          {error || 'That discussion could not be found.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={refresh}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={[TYPE.buttonSm, styles.retryLabel]}>Try again</Text>
        </Pressable>
      </View>
    )
  }
  return <EditorBody key={post.id} post={post} onDone={onDone} />
}

type ForumPostEditorScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ForumPostEditor'
>

function ForumPostEditorScreen({ route, navigation }: ForumPostEditorScreenProps) {
  const insets = useSafeAreaInsets()
  const postId = route.params?.postId
  const handleDone = () => navigation.goBack()

  return (
    <View style={styles.screen}>
      <TopBar
        topInset={insets.top}
        label={postId ? 'Edit discussion' : 'New discussion'}
        onBack={handleDone}
      />
      {postId ? (
        <EditLoader postId={postId} onDone={handleDone} />
      ) : (
        <EditorBody post={null} onDone={handleDone} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingBottom: SPACING.sm,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },
  backButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarLabel: {
    color: COLORS.mute,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  fieldLabel: {
    color: COLORS.ink,
    marginTop: SPACING.md,
  },
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    color: COLORS.ink,
    ...TYPE.bodyMd,
  },
  bodyInput: {
    minHeight: BODY_INPUT_HEIGHT,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  fieldError: {
    color: COLORS.error,
  },
  pillScroller: {
    flexGrow: 0,
  },
  pillRow: {
    gap: SPACING.sm,
  },
  pill: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  pillInactive: {
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
  },
  pillActive: {
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
  },
  pillPressed: {
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.ink,
  },
  pillTextActive: {
    color: COLORS.onDark,
  },
  photos: {
    marginTop: SPACING.lg,
  },
  submit: {
    marginTop: SPACING.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  errorBannerText: {
    flex: 1,
    color: COLORS.ink,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: GUTTER,
  },
  centeredText: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  retry: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  retryLabel: {
    color: COLORS.ink,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default ForumPostEditorScreen
