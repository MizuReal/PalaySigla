import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from '../Avatar'
import Icon from '../Icon'
import ListingLocationMap from './ListingLocationMap'
import { buildOpenStreetMapUrl } from './mapConfig'
import Modal from '../Modal'
import Photo from '../Photo'
import useListingDetail from '../../hooks/useListingDetail'
import useListingConversations from '../../hooks/useListingConversations'
import useStartConversation from '../../hooks/useStartConversation'
import useUserRating from '../../hooks/useUserRating'
import useUserReviews from '../../hooks/useUserReviews'
import ReviewItem from '../profile/ReviewItem'
import RatingStars from '../profile/RatingStars'
import {
  clearListingReservation,
  markListingSold,
  reserveListing,
  softDeleteListing,
} from '../../services/listings'
import type { ListingBuyer } from '../../services/listings'
import { AUTH_MODAL_MODES, useAuth } from '../../context/authContext'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import {
  CATEGORY_LABELS,
  formatCoordinates,
  formatPrice,
  formatRelativeTime,
  UNIT_LABELS,
} from '../../utils/format'

const DETAIL_TITLE_ID = 'listing-detail-title'

const TRANSACTION_MODES = Object.freeze({
  RESERVE: 'reserve',
  SOLD: 'sold',
} as const)

type TransactionMode = (typeof TRANSACTION_MODES)[keyof typeof TRANSACTION_MODES]

interface ListingDetailModalProps {
  listingId: string
  onClose: () => void
  onChanged: () => void
}

function ListingDetailModal({ listingId, onClose, onChanged }: ListingDetailModalProps) {
  const { listing, imageUrl, isLoading, error } = useListingDetail(listingId)
  const { user, openAuthModal } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { start, isStarting, error: startError } = useStartConversation()
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const [isActing, setIsActing] = useState(false)
  const [transactionMode, setTransactionMode] = useState<TransactionMode | null>(null)
  const [selectedBuyerId, setSelectedBuyerId] = useState('')
  const buyers = useListingConversations(transactionMode ? listingId : null)
  const sellerRating = useUserRating(listing?.user_id ?? null)
  const sellerReviews = useUserReviews(listing?.user_id ?? null)

  const isOwner = user !== null && listing?.user_id === user.id

  const ratingSummary =
    sellerRating.ratingCount > 0
      ? `${sellerRating.ratingAvg.toFixed(1)} · ${sellerRating.ratingCount} review${
          sellerRating.ratingCount === 1 ? '' : 's'
        }`
      : 'No reviews yet'

  const selectedConversation = buyers.conversations.find(
    (conversation) => conversation.buyer_id === selectedBuyerId
  )
  const selectedBuyer: ListingBuyer | null = selectedConversation
    ? {
        buyerId: selectedConversation.buyer_id,
        buyerName: selectedConversation.buyer_name,
      }
    : null
  const hasBuyerChoices = buyers.conversations.length > 0
  const canConfirm = !isActing && (!hasBuyerChoices || selectedBuyer !== null)

  const handleMessageSeller = async () => {
    if (!listing) {
      return
    }
    if (!user) {
      openAuthModal(AUTH_MODAL_MODES.LOGIN)
      return
    }
    const conversation = await start(listing)
    if (conversation) {
      onClose()
      navigate(`/messages/${conversation.id}`)
    }
  }

  const openTransaction = (mode: TransactionMode) => {
    setSelectedBuyerId('')
    setTransactionMode(mode)
  }

  const closeTransaction = () => {
    setTransactionMode(null)
    setSelectedBuyerId('')
  }

  const handleConfirmTransaction = async () => {
    if (!listing || !transactionMode) {
      return
    }
    const isSold = transactionMode === TRANSACTION_MODES.SOLD
    setIsActing(true)
    try {
      if (isSold) {
        await markListingSold(listing.id, selectedBuyer)
      } else {
        await reserveListing(listing.id, selectedBuyer)
      }
      showToast(
        isSold ? 'Listing marked as sold.' : 'Listing reserved.',
        TOAST_VARIANTS.SUCCESS
      )
      onChanged()
      onClose()
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : isSold
            ? 'Could not mark the listing as sold.'
            : 'Could not reserve the listing.',
        TOAST_VARIANTS.ERROR
      )
    } finally {
      setIsActing(false)
    }
  }

  const handleRelease = async () => {
    if (!listing) {
      return
    }
    setIsActing(true)
    try {
      await clearListingReservation(listing.id)
      showToast('Reservation released.', TOAST_VARIANTS.SUCCESS)
      onChanged()
      onClose()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Could not release the reservation.',
        TOAST_VARIANTS.ERROR
      )
    } finally {
      setIsActing(false)
    }
  }

  const handleRemove = async () => {
    if (!listing) {
      return
    }
    if (!isConfirmingRemove) {
      setIsConfirmingRemove(true)
      return
    }
    setIsActing(true)
    try {
      await softDeleteListing(listing.id)
      showToast('Listing removed.', TOAST_VARIANTS.SUCCESS)
      onChanged()
      onClose()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Could not remove the listing.',
        TOAST_VARIANTS.ERROR
      )
    } finally {
      setIsActing(false)
    }
  }

  const renderBuyerPicker = () => {
    const isSold = transactionMode === TRANSACTION_MODES.SOLD
    return (
      <div className="mt-3">
        <p className="caption-md text-primary">
          {isSold ? 'Who is this sold to?' : 'Who is this reserved for?'}
        </p>
        {buyers.isLoading ? (
          <div className="mt-3 space-y-2" aria-hidden="true">
            <div className="h-11 animate-pulse bg-canvas" />
            <div className="h-11 animate-pulse bg-canvas" />
          </div>
        ) : buyers.error ? (
          <p role="alert" className="body-sm mt-3 text-error">
            {buyers.error}
          </p>
        ) : hasBuyerChoices ? (
          <ul className="mt-3 flex flex-col gap-1">
            {buyers.conversations.map((conversation) => (
              <li key={conversation.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-hairline bg-canvas px-4">
                  <input
                    type="radio"
                    name="transaction-buyer"
                    checked={selectedBuyerId === conversation.buyer_id}
                    onChange={() => setSelectedBuyerId(conversation.buyer_id)}
                  />
                  <span className="body-sm text-ink">{conversation.buyer_name}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="body-sm mt-3 text-mute">
            No buyer conversations for this listing yet. You can continue without
            tagging a buyer — reviews will not be available for this transaction.
          </p>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleConfirmTransaction}
            disabled={!canConfirm}
            className="h-11 w-full border border-primary px-4 button-sm text-ink transition-colors hover:bg-primary hover:text-on-primary disabled:text-ash"
          >
            {isActing ? 'Saving…' : isSold ? 'Mark as sold' : 'Reserve listing'}
          </button>
          <button
            type="button"
            onClick={closeTransaction}
            disabled={isActing}
            className="h-11 w-full border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const renderOwnerActions = () => {
    if (!isOwner || !listing) {
      return null
    }
    return (
      <section className="mt-6 rounded-sm border border-hairline bg-surface-soft p-4">
        <p className="caption-md text-primary">Manage this listing</p>
        {transactionMode ? (
          renderBuyerPicker()
        ) : isConfirmingRemove ? (
          <div className="mt-3 border border-error bg-canvas p-4">
            <p className="body-sm text-ink">Remove this listing permanently?</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleRemove}
                disabled={isActing}
                className="h-11 w-full border border-error px-4 button-sm text-error transition-colors hover:bg-error hover:text-on-dark disabled:text-ash"
              >
                {isActing ? 'Removing…' : 'Yes, remove it'}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingRemove(false)}
                disabled={isActing}
                className="h-11 w-full border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {listing.status === 'sold' && listing.sold_to_name && (
              <p className="caption-sm mt-3 text-mute">Sold to {listing.sold_to_name}</p>
            )}
            {listing.status === 'reserved' && listing.reserved_for_name && (
              <p className="caption-sm mt-3 text-mute">
                Reserved for {listing.reserved_for_name}
              </p>
            )}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {listing.status === 'active' && (
                <>
                  <button
                    type="button"
                    onClick={() => openTransaction(TRANSACTION_MODES.RESERVE)}
                    disabled={isActing}
                    className="h-11 w-full border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
                  >
                    Reserve for a buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => openTransaction(TRANSACTION_MODES.SOLD)}
                    disabled={isActing}
                    className="h-11 w-full border border-primary px-4 button-sm text-ink transition-colors hover:bg-primary hover:text-on-primary disabled:text-ash"
                  >
                    Mark as sold
                  </button>
                </>
              )}
              {listing.status === 'reserved' && (
                <>
                  <button
                    type="button"
                    onClick={() => openTransaction(TRANSACTION_MODES.SOLD)}
                    disabled={isActing}
                    className="h-11 w-full border border-primary px-4 button-sm text-ink transition-colors hover:bg-primary hover:text-on-primary disabled:text-ash"
                  >
                    Mark as sold
                  </button>
                  <button
                    type="button"
                    onClick={handleRelease}
                    disabled={isActing}
                    className="h-11 w-full border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
                  >
                    {isActing ? 'Releasing…' : 'Release reservation'}
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isActing}
              className="mt-3 h-11 w-full border border-error px-4 button-sm text-error transition-colors hover:bg-error hover:text-on-dark disabled:text-ash"
            >
              Remove listing
            </button>
          </>
        )}
      </section>
    )
  }

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="aspect-[4/3] w-full bg-surface-soft" />
            <div className="space-y-4">
              <div className="h-6 w-2/3 bg-surface-soft" />
              <div className="h-5 w-1/3 bg-surface-soft" />
              <div className="h-4 w-full bg-surface-soft" />
              <div className="h-4 w-4/5 bg-surface-soft" />
            </div>
          </div>
          <div className="h-[280px] w-full bg-surface-soft sm:h-[360px]" />
          <div className="h-4 w-2/3 bg-surface-soft" />
        </div>
      )
    }
    if (error || !listing) {
      return (
        <div role="alert" className="py-8 text-center">
          <p className="body-strong text-ink">{error ?? 'Listing unavailable.'}</p>
          <button
            type="button"
            onClick={onClose}
            className="body-sm mt-4 text-link-blue transition-colors hover:text-primary"
          >
            Close
          </button>
        </div>
      )
    }
    const hasCoordinates =
      Number.isFinite(listing.lat) && Number.isFinite(listing.lng)
    return (
      <>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Photo
              src={imageUrl}
              alt={listing.title}
              fallbackLabel={listing.title}
              aspectClass="aspect-[4/3]"
              loading="eager"
              fetchPriority="high"
            />
          </div>
          <div>
            <span className="rounded-sm border border-hairline bg-surface-soft px-3 py-1.5">
              <span className="caption-md text-primary">
                {CATEGORY_LABELS[listing.category]}
              </span>
            </span>
            {listing.status !== 'active' && (
              <span className="ml-2 rounded-sm border border-hairline bg-surface-soft px-3 py-1.5">
                <span className="caption-md text-ink">
                  {listing.status === 'sold' ? 'Sold' : 'Reserved'}
                </span>
              </span>
            )}
            <h2 id={DETAIL_TITLE_ID} className="heading-lg mt-3 text-ink">
              {listing.title}
            </h2>
            <p className="mt-2 text-ink">
              <span className="heading-md text-primary">
                {formatPrice(listing.price ?? 0)}
              </span>{' '}
              <span className="caption-sm text-mute">{UNIT_LABELS[listing.unit]}</span>
            </p>
            {listing.quantity !== null && (
              <p className="caption-sm mt-1 text-mute">
                Quantity: {listing.quantity} {listing.unit}
              </p>
            )}
            <p className="caption-sm mt-1 text-mute">
              Posted {formatRelativeTime(listing.created_at)}
            </p>

            <div className="mt-4 flex flex-col gap-3 rounded-sm border border-hairline bg-surface-soft p-3 sm:flex-row sm:items-center">
              <Link
                to={`/farmers/${listing.user_id}`}
                className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
                aria-label={`View ${listing.seller_name}'s farmer profile`}
              >
                <Avatar name={listing.seller_name} />
                <div className="min-w-0 flex-1">
                  <p className="body-strong truncate text-ink">{listing.seller_name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <RatingStars rating={Math.round(sellerRating.ratingAvg)} />
                    <span className="caption-sm text-mute">{ratingSummary}</span>
                  </div>
                </div>
              </Link>
              {!isOwner && (
                <button
                  type="button"
                  onClick={handleMessageSeller}
                  disabled={isStarting}
                  className="h-11 w-full shrink-0 border border-primary px-5 button-sm text-ink transition-colors hover:bg-primary hover:text-on-primary disabled:text-ash sm:w-auto"
                >
                  {isStarting ? 'Opening…' : 'Message seller'}
                </button>
              )}
            </div>
            {startError && (
              <p className="caption-sm mt-2 text-error" role="alert">
                {startError}
              </p>
            )}
          </div>
        </div>
        <section className="mt-6 border-t border-hairline pt-6">
          <p className="caption-md text-primary">About this listing</p>
          <p className="body-sm mt-3 whitespace-pre-line text-body">
            {listing.description || 'No description provided.'}
          </p>
        </section>

        {renderOwnerActions()}

        {hasCoordinates && (
          <section className="mt-6 border-t border-hairline pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="caption-md text-primary">Location</p>
              <a
                href={buildOpenStreetMapUrl(listing.lat, listing.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="caption-sm text-link-blue transition-colors hover:text-primary"
              >
                Open in OpenStreetMap
              </a>
            </div>
            <ListingLocationMap
              lat={listing.lat}
              lng={listing.lng}
              locationLabel={listing.location_label}
              heightClass="mt-3 h-[280px] sm:h-[360px]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="flex items-center gap-1.5 text-ink">
                <Icon name="pin" className="h-4 w-4 shrink-0" />
                <span className="body-sm">{listing.location_label}</span>
              </p>
              <p className="caption-sm text-mute">
                {formatCoordinates(listing.lat, listing.lng)}
              </p>
            </div>
          </section>
        )}

        {sellerReviews.reviews.length > 0 && (
          <section className="mt-6 border-t border-hairline pt-6">
            <p className="caption-md text-primary">Reviews</p>
            <div className="mt-4 space-y-4">
              {sellerReviews.reviews.slice(0, 3).map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>
          </section>
        )}
      </>
    )
  }

  return (
    <Modal
      onClose={onClose}
      labelledBy={DETAIL_TITLE_ID}
      panelClassName="max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
    >
      {renderBody()}
    </Modal>
  )
}

export default ListingDetailModal
