import { useState } from 'react'

function Photo({
  src,
  alt,
  fallbackLabel,
  aspectClass,
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
}) {
  const [hasError, setHasError] = useState(false)

  if (hasError || !src) {
    return (
      <div
        className={`flex w-full items-center justify-center border border-hairline bg-surface-soft ${aspectClass} ${className}`}
      >
        <p className="caption-sm px-4 text-center text-mute">
          Image unavailable — {fallbackLabel}
        </p>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      onError={() => setHasError(true)}
      className={`w-full border border-hairline object-cover ${aspectClass} ${className}`}
    />
  )
}

export default Photo
