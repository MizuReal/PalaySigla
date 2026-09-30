import { useEffect, useState } from 'react'
import Icon from '../Icon'
import DocumentPreviewModal from './DocumentPreviewModal'
import { getCredentialDocumentUrl } from '../../services/credentials'

interface CertificateThumbnailProps {
  storagePath: string
  title: string
}

// 64px 4:3 signed-URL thumbnail that opens the shared preview modal. Used by
// the owner record rows and the public wall cards.
function CertificateThumbnail({ storagePath, title }: CertificateThumbnailProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const signed = await getCredentialDocumentUrl(storagePath)
        if (!isCancelled) {
          setUrl(signed)
        }
      } catch {
        if (!isCancelled) {
          setUrl('')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [storagePath])

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`View ${title}`}
        className="block w-16 shrink-0 border border-hairline bg-surface-soft transition-opacity hover:opacity-80"
      >
        {isLoading ? (
          <span className="block aspect-[4/3] w-full animate-pulse bg-surface-soft" />
        ) : url ? (
          <img src={url} alt={title} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <span className="flex aspect-[4/3] w-full items-center justify-center">
            <Icon name="camera" className="h-4 w-4 text-mute" />
          </span>
        )}
      </button>
      {isOpen ? (
        <DocumentPreviewModal
          storagePath={storagePath}
          title={title}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  )
}

export default CertificateThumbnail
