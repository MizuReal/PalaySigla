import { useState } from 'react'
import Icon from '../Icon.jsx'
import ListingLocationMap from './ListingLocationMap.jsx'
import { buildOpenStreetMapUrl } from './mapConfig.js'
import Modal from '../Modal.jsx'
import Photo from '../Photo.jsx'
import useListingDetail from '../../hooks/useListingDetail.js'
import { softDeleteListing, updateListingStatus } from '../../services/listings.js'
import { useAuth } from '../../context/authContext.js'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext.js'
import {
  CATEGORY_LABELS,
  formatCoordinates,
  formatPrice,
  formatRelativeTime,
  UNIT_LABELS,
} from '../../utils/format.js'

const DETAIL_TITLE_ID = 'listing-detail-title'

interface ListingDetailModalProps {
  listingId: string
  onClose: () => void
  onChanged: () => void
}

function ListingDetailModal({ listingId, onClose, onChanged }: ListingDetailModalProps) {
  const { listing, imageUrl, isLoading, error } = useListingDetail(listingId)
  const { user } = useAuth()
  const { showToast } = useToast()
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const [isActing, setIsActing] = useState(false)

  const isOwner = user !== null && listing?.user_id === user.id

  const handleMarkSold = async () => {
    if (!listing) {
      return
    }
    setIsActing(true)
    try {
      await updateListingStatus(listing.id, 'sold')
      showToast('Listing marked as sold.', TOAST_VARIANTS.SUCCESS)
      onChanged()
      onClose()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Could not update the listing.',
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

  const renderOwnerActions = () => {
    if (!isOwner || !listing) {
      return null
    }
    if (isConfirmingRemove) {
      return (
        <div className="mt-6 border border-error bg-surface-soft p-4">
          <p className="body-sm text-ink">Remove this listing permanently?</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleRemove}
              disabled={isActing}
              className="h-11 border border-error px-5 button-sm text-error transition-colors hover:bg-error hover:text-on-dark disabled:text-ash"
            >
              {isActing ? 'Removing…' : 'Yes, remove it'}
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingRemove(false)}
              disabled={isActing}
              className="h-11 border border-hairline bg-canvas px-5 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="mt-6 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row">
        {listing.status === 'active' && (
          <button
            type="button"
            onClick={handleMarkSold}
            disabled={isActing}
            className="h-11 border border-primary px-5 button-sm text-ink transition-colors hover:bg-primary hover:text-on-primary disabled:text-ash"
          >
            {isActing ? 'Updating…' : 'Mark as sold'}
          </button>
        )}
        <button
          type="button"
          onClick={handleRemove}
          disabled={isActing}
          className="h-11 border border-error px-5 button-sm text-error transition-colors hover:bg-error hover:text-on-dark disabled:text-ash"
        >
          Remove listing
        </button>
      </div>
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
            {listing.status === 'sold' && (
              <span className="ml-2 rounded-sm border border-hairline bg-surface-soft px-3 py-1.5">
                <span className="caption-md text-ink">Sold</span>
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
            {listing.description && (
              <p className="body-sm mt-4 whitespace-pre-line text-body">
                {listing.description}
              </p>
            )}
            {renderOwnerActions()}
          </div>
        </div>
        <div className="mt-6 border-t border-hairline pt-4">
          {hasCoordinates && (
            <>
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
            </>
          )}
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <p className="body-strong text-ink">{listing.seller_name}</p>
            <p className="caption-sm text-mute">
              Posted {formatRelativeTime(listing.created_at)}
            </p>
          </div>
        </div>
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
