// Review form — a root-stack push opened from a Purchases row, a sold Selling
// history row, or a listing conversation. Loads the transaction by id (RLS
// returns nothing for a non-party) and submits the counterparty review.
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Icon from '../components/Icon'
import StarRatingInput from '../components/profile/StarRatingInput'
import { useAuth } from '../context/authContext'
import useReviewForm from '../hooks/useReviewForm'
import { fetchTransaction } from '../services/transactions'
import { MAX_COMMENT_CHARS } from '../services/reviews'
import { getDisplayName } from '../utils/userProfile'
import { COLORS, GUTTER, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../theme/designTokens'
import type { RootStackParamList } from '../types/navigation'
import type { TransactionRow } from '../types/domain'

type ReviewFormScreenProps = NativeStackScreenProps<RootStackParamList, 'ReviewForm'>

interface ReviewFormBodyProps {
  transaction: TransactionRow
  viewerId: string
  viewerName: string
  onDone: () => void
}

function ReviewFormBody({
  transaction,
  viewerId,
  viewerName,
  onDone,
}: ReviewFormBodyProps) {
  const { counterpartyName, canReview, isSubmitting, error, submit } = useReviewForm({
    transaction,
    viewerId,
    viewerName,
  })
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const canSubmit = rating >= 1 && !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit) {
      return
    }
    const succeeded = await submit(rating, comment)
    if (succeeded) {
      onDone()
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[TYPE.headingSm, styles.heading]}>
        Review {counterpartyName || 'this transaction'}
      </Text>
      <Text style={[TYPE.bodySm, styles.listing]}>{transaction.listing_title}</Text>

      {!canReview ? (
        <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.blocked]}>
          This transaction can no longer be reviewed.
        </Text>
      ) : (
        <>
          <Text style={[TYPE.captionMd, styles.label]}>Rating</Text>
          <StarRatingInput value={rating} onChange={setRating} disabled={isSubmitting} />

          <Text style={[TYPE.captionMd, styles.label]}>Comment (optional)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            maxLength={MAX_COMMENT_CHARS}
            multiline
            placeholder="Share your experience…"
            placeholderTextColor={COLORS.stone}
            accessibilityLabel="Comment"
            style={[TYPE.bodyMd, styles.input]}
          />

          {error ? (
            <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.error]}>
              {error}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              !canSubmit && styles.actionDisabled,
              pressed && canSubmit && styles.submitPressed,
            ]}
          >
            <Text
              style={[
                TYPE.buttonSm,
                styles.submitLabel,
                !canSubmit && styles.labelDisabled,
              ]}
            >
              {isSubmitting ? 'Submitting…' : 'Submit review'}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  )
}

function ReviewFormScreen({ route, navigation }: ReviewFormScreenProps) {
  const { transactionId } = route.params
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [transaction, setTransaction] = useState<TransactionRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      try {
        const result = await fetchTransaction(transactionId)
        if (isCurrent) {
          setTransaction(result)
          setLoadError(result ? '' : 'That transaction could not be found.')
        }
      } catch (err) {
        if (isCurrent) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Could not load the transaction. Please try again.'
          )
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [transactionId])

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )
    }
    if (!transaction || !user) {
      return (
        <View style={styles.centered}>
          <Text accessibilityRole="alert" style={[TYPE.bodyStrong, styles.centeredText]}>
            {loadError || 'That transaction could not be found.'}
          </Text>
        </View>
      )
    }
    return (
      <ReviewFormBody
        transaction={transaction}
        viewerId={user.id}
        viewerName={getDisplayName(user)}
        onDone={() => navigation.goBack()}
      />
    )
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.topBarRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            hitSlop={SPACING.sm}
            style={({ pressed }) => [styles.backButton, pressed && styles.dim]}
          >
            <Icon name="chevron-left" size={24} color={COLORS.ink} />
          </Pressable>
          <Text style={[TYPE.captionMd, styles.topBarLabel]}>Review</Text>
        </View>
      </View>
      {renderBody()}
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
  dim: {
    opacity: 0.6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  heading: {
    color: COLORS.ink,
  },
  listing: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
  blocked: {
    color: COLORS.error,
    marginTop: SPACING.lg,
  },
  label: {
    color: COLORS.ink,
    marginTop: SPACING.xl,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    color: COLORS.ink,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    textAlignVertical: 'top',
  },
  error: {
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  submitButton: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  submitPressed: {
    backgroundColor: COLORS.primary,
  },
  submitLabel: {
    color: COLORS.ink,
  },
  labelDisabled: {
    color: COLORS.ash,
  },
  actionDisabled: {
    opacity: 0.5,
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
})

export default ReviewFormScreen
