import { useState } from 'react'
import Button from '../Button.jsx'
import Icon from '../Icon.jsx'
import ImageUploader from './ImageUploader.jsx'
import MapPicker from './MapPicker.jsx'
import Modal from '../Modal.jsx'
import usePostListing from '../../hooks/usePostListing.js'
import { LISTING_CATEGORIES, LISTING_UNITS } from '../../services/listings.js'
import { CATEGORY_LABELS, UNIT_LABELS } from '../../utils/format.js'
import { validateListingStep } from '../../utils/listingValidation.js'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext.js'

const MODAL_TITLE_ID = 'post-listing-title'
const TOTAL_STEPS = 3

// error keys map to focusable field ids; location has no input to focus
const FIELD_ID_MAP = Object.freeze({
  title: 'title',
  description: 'description',
  price: 'price',
  unit: 'unit',
  category: 'category',
  quantity: 'quantity',
  photo: 'listing-photo',
})

const STEP_TITLES = Object.freeze({
  1: 'Tell us about it',
  2: 'Add a photo',
  3: 'Pin the location',
})

const STEP_DESCRIPTIONS = Object.freeze({
  1: 'What are you selling, and for how much?',
  2: 'A clear close-up helps buyers trust the listing.',
  3: 'Drag the map and drop the pin where it is.',
})

const INPUT_CLASSES =
  'h-11 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px]'

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
}) {
  return (
    <div>
      <label htmlFor={id} className="caption-md text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`mt-2 ${INPUT_CLASSES} ${error ? 'border-error' : ''}`}
      />
      {error && (
        <p className="caption-sm mt-2 text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function SelectField({ id, label, value, onChange, options, error, blankLabel }) {
  return (
    <div>
      <label htmlFor={id} className="caption-md text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        className={`mt-2 ${INPUT_CLASSES} ${error ? 'border-error' : ''}`}
      >
        <option value="">{blankLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="caption-sm mt-2 text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function PostListingModal({ onClose, onPosted }) {
  const { postListing, isSubmitting } = usePostListing()
  const { showToast } = useToast()

  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imageError, setImageError] = useState('')
  const [position, setPosition] = useState(null)
  const [locationLabel, setLocationLabel] = useState('')

  const clearFieldError = (field) => {
    setErrors((current) => {
      if (!(field in current)) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const goToStep = (nextStep) => {
    const stepErrors = validateListingStep(step, {
      title,
      description,
      price,
      unit,
      category,
      quantity,
      imageFile,
      lat: position ? position[0] : null,
      lng: position ? position[1] : null,
      locationLabel,
    })
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) {
      const firstField = Object.keys(stepErrors)[0]
      document.getElementById(FIELD_ID_MAP[firstField])?.focus()
      return
    }
    setServerError('')
    setStep(nextStep)
  }

  const handleSubmit = async () => {
    const stepErrors = validateListingStep(TOTAL_STEPS, {
      title,
      description,
      price,
      unit,
      category,
      quantity,
      imageFile,
      lat: position ? position[0] : null,
      lng: position ? position[1] : null,
      locationLabel,
    })
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) {
      const firstField = Object.keys(stepErrors)[0]
      document.getElementById(FIELD_ID_MAP[firstField])?.focus()
      return
    }
    setServerError('')
    try {
      await postListing({
        title,
        description: description.trim(),
        price: Number(price),
        unit,
        category,
        quantity: quantity === '' ? null : Number(quantity),
        lat: position[0],
        lng: position[1],
        locationLabel,
        imageFile,
      })
      showToast('Listing posted! Buyers can now find it.', TOAST_VARIANTS.SUCCESS)
      onPosted()
    } catch (err) {
      setServerError(err.message)
    }
  }

  const renderStepBody = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <Field
            id="title"
            label="Title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              clearFieldError('title')
            }}
            placeholder="Freshly harvested palay, dry and clean"
            error={errors.title}
          />
          <div>
            <label htmlFor="description" className="caption-md text-ink">
              Description <span className="caption-sm text-mute">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
                clearFieldError('description')
              }}
              placeholder="Variety, moisture, harvest date — anything a buyer should know."
              rows={4}
              aria-invalid={errors.description ? true : undefined}
              className={`mt-2 w-full border border-hairline bg-canvas px-4 py-3 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary ${errors.description ? 'border-error' : ''}`}
            />
            {errors.description && (
              <p className="caption-sm mt-2 text-error" role="alert">
                {errors.description}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="price"
              label="Price (₱)"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => {
                setPrice(event.target.value)
                clearFieldError('price')
              }}
              placeholder="1200"
              error={errors.price}
            />
            <SelectField
              id="unit"
              label="Unit"
              value={unit}
              onChange={(event) => {
                setUnit(event.target.value)
                clearFieldError('unit')
              }}
              options={LISTING_UNITS.map((unitKey) => ({
                value: unitKey,
                label: UNIT_LABELS[unitKey],
              }))}
              blankLabel="Choose a unit…"
              error={errors.unit}
            />
            <SelectField
              id="category"
              label="Category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                clearFieldError('category')
              }}
              options={LISTING_CATEGORIES.map((categoryKey) => ({
                value: categoryKey,
                label: CATEGORY_LABELS[categoryKey],
              }))}
              blankLabel="Choose a category…"
              error={errors.category}
            />
            <Field
              id="quantity"
              label="Quantity"
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value)
                clearFieldError('quantity')
              }}
              placeholder="50"
              error={errors.quantity}
            />
          </div>
        </div>
      )
    }

    if (step === 2) {
      return (
        <ImageUploader
          onFileChange={({ file, error }) => {
            setImageFile(file)
            setImageError(error)
            if (file || !error) {
              clearFieldError('photo')
            }
          }}
          error={imageError || errors.photo}
        />
      )
    }

    return (
      <MapPicker
        position={position}
        onPositionChange={(nextPosition) => {
          setPosition(nextPosition)
          clearFieldError('location')
        }}
        onLocationLabel={setLocationLabel}
      />
    )
  }

  const renderStepFooter = () => {
    if (step > 1 && step < TOTAL_STEPS) {
      return (
        <Button variant="outline" onClick={() => setStep(step - 1)} className="w-full justify-center">
          Back
        </Button>
      )
    }
    return null
  }

  return (
    <Modal onClose={onClose} labelledBy={MODAL_TITLE_ID} panelClassName="max-w-2xl">
      <p className="caption-md text-primary">
        Post a listing — step {step} of {TOTAL_STEPS}
      </p>
      <h2 id={MODAL_TITLE_ID} className="heading-md mt-2 text-ink">
        {STEP_TITLES[step]}
      </h2>
      <p className="body-sm mt-1 text-mute">{STEP_DESCRIPTIONS[step]}</p>
      <div className="mt-4 h-1 w-full bg-surface-soft">
        <div
          className="h-1 bg-primary transition-all duration-200"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="mt-6">{renderStepBody()}</div>

      {serverError && (
        <div
          className="mt-6 flex items-start gap-3 border border-error bg-surface-soft p-4"
          role="alert"
        >
          <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0 text-error" />
          <p className="body-sm text-ink">{serverError}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <div className="sm:w-32">{renderStepFooter()}</div>
        {step < TOTAL_STEPS ? (
          <Button onClick={() => goToStep(step + 1)} className="w-full justify-center sm:w-auto">
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full justify-center sm:w-auto"
          >
            {isSubmitting ? 'Posting…' : 'Post listing'}
          </Button>
        )}
      </div>
    </Modal>
  )
}

export default PostListingModal
