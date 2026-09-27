// Purchases — the buyer-side counterpart of Selling history: durable reserved
// and sold records that stay reachable even after the listing leaves the feed
// or is removed. Backed by services/transactions.ts under participant RLS.
import { Animated, ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import useMyPurchases from '../../hooks/useMyPurchases'
import useMyReviewedTransactionIds from '../../hooks/useMyReviewedTransactionIds'
import usePulseOpacity from '../../hooks/usePulseOpacity'
import { useAuth } from '../../context/authContext'
import { formatDate, formatPrice, UNIT_LABELS } from '../../utils/format'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'
import type { RootStackParamList } from '../../types/navigation'
import type { TransactionRow } from '../../types/domain'

const SKELETON_COUNT = 3

const STATUS_LABELS: Record<string, string> = Object.freeze({
  reserved: 'Reserved',
  sold: 'Sold',
})

function purchaseDate(transaction: TransactionRow): string {
  return transaction.sold_at ?? transaction.reserved_at ?? transaction.created_at
}

function PurchasesSkeleton() {
  const opacity = usePulseOpacity()
  return (
    <View style={styles.stack}>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Animated.View
          key={index}
          accessible
          accessibilityLabel="Loading your purchases"
          style={[styles.skeletonRow, { opacity }]}
        >
          <View style={styles.skeletonBarWide} />
          <View style={styles.skeletonBarThird} />
          <View style={styles.skeletonBarFull} />
        </Animated.View>
      ))}
    </View>
  )
}

function PurchasesPanel() {
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const {
    purchases,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore,
  } = useMyPurchases(user?.id)
  const reviewed = useMyReviewedTransactionIds(user?.id ?? null)

  if (!user) {
    return null
  }

  const renderList = () => {
    if (isInitialLoading) {
      return <PurchasesSkeleton />
    }
    if (error) {
      return (
        <View style={[styles.panel, styles.errorPanel]}>
          <Text accessibilityRole="alert" style={[TYPE.bodyStrong, styles.errorText]}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={refresh}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            <Text style={[TYPE.buttonSm, styles.retryLabel]}>Try again</Text>
          </Pressable>
        </View>
      )
    }
    if (purchases.length === 0) {
      return (
        <View style={[styles.panel, styles.emptyPanel]}>
          <Text style={[TYPE.bodySm, styles.emptyText]}>
            Nothing yet. When a seller reserves or sells you a listing, it will
            show up here so you can keep track and leave a review.
          </Text>
        </View>
      )
    }
    return (
      <View>
        <View style={styles.stack}>
          {purchases.map((transaction) => (
            <View key={transaction.id} style={styles.row}>
              <View style={styles.titleRow}>
                <Text style={[TYPE.cardTitle, styles.title]} numberOfLines={2}>
                  {transaction.listing_title}
                </Text>
                <View style={styles.chip}>
                  <Text style={[TYPE.captionMd, styles.chipText]}>
                    {STATUS_LABELS[transaction.status] ?? transaction.status}
                  </Text>
                </View>
              </View>
              <View style={styles.priceRow}>
                <Text style={[TYPE.headingSm, styles.price]}>
                  {formatPrice(transaction.price ?? 0)}
                </Text>
                <Text style={[TYPE.captionSm, styles.unit]}>
                  {UNIT_LABELS[transaction.unit]}
                </Text>
              </View>
              <Text style={[TYPE.captionSm, styles.meta]}>
                Seller {transaction.seller_name} · {formatDate(purchaseDate(transaction))}
              </Text>
              {transaction.status === 'sold' && transaction.buyer_id !== null ? (
                reviewed.has(transaction.id) ? (
                  <Text style={[TYPE.captionSm, styles.reviewed]}>Reviewed</Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      navigation.navigate('ReviewForm', { transactionId: transaction.id })
                    }
                    style={({ pressed }) => [
                      styles.reviewButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[TYPE.buttonSm, styles.reviewLabel]}>
                      Leave a review
                    </Text>
                  </Pressable>
                )
              ) : null}
            </View>
          ))}
        </View>
        {hasMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoadingMore }}
            disabled={isLoadingMore}
            onPress={loadMore}
            style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}
          >
            {isLoadingMore ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={[TYPE.buttonMd, styles.retryLabel]}>Load more</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    )
  }

  return (
    <View>
      <Text style={[TYPE.headingSm, styles.heading]}>Purchases</Text>
      <Text style={[TYPE.bodySm, styles.lead]}>
        Listings a seller has reserved or sold to you.
      </Text>
      <View style={styles.listWrap}>{renderList()}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  heading: {
    color: COLORS.ink,
  },
  lead: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
  listWrap: {
    marginTop: SPACING.lg,
  },
  stack: {
    gap: SPACING.md,
  },
  row: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.lg,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    flexShrink: 1,
    color: COLORS.ink,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    color: COLORS.ink,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  price: {
    color: COLORS.primary,
  },
  unit: {
    color: COLORS.mute,
  },
  meta: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  reviewed: {
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  reviewButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  reviewLabel: {
    color: COLORS.ink,
  },
  panel: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  errorPanel: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
  },
  errorText: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  emptyPanel: {
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  emptyText: {
    color: COLORS.body,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
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
  loadMoreButton: {
    minHeight: 44,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
  },
  pressed: {
    opacity: 0.6,
  },
  skeletonRow: {
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.lg,
  },
  skeletonBarWide: {
    width: '65%',
    height: 20,
    backgroundColor: COLORS.surfaceSoft,
  },
  skeletonBarThird: {
    width: '35%',
    height: 16,
    backgroundColor: COLORS.surfaceSoft,
  },
  skeletonBarFull: {
    width: '80%',
    height: 16,
    backgroundColor: COLORS.surfaceSoft,
  },
})

export default PurchasesPanel
