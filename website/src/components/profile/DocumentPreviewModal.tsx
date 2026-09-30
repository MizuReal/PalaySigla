import { useEffect, useState } from 'react'
import Modal from '../Modal'
import Photo from '../Photo'
import { getCredentialDocumentUrl } from '../../services/credentials'

const TITLE_ID = 'document-preview-title'

interface DocumentPreviewModalProps {
  storagePath: string
  title: string
  onClose: () => void
}

// Signs the private object on open and shows it full-panel. Both the owner and
// the wall use the same component; the storage policies decide who succeeds.
function DocumentPreviewModal({
  storagePath,
  title,
  onClose,
}: DocumentPreviewModalProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const signed = await getCredentialDocumentUrl(storagePath)
        if (!isCancelled) {
          setUrl(signed)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not load the document.'
          )
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
    <Modal onClose={onClose} labelledBy={TITLE_ID} panelClassName="max-w-2xl">
      <h2 id={TITLE_ID} className="heading-sm text-ink">
        {title}
      </h2>
      <div className="mt-4">
        {isLoading ? (
          <div className="aspect-[4/3] w-full animate-pulse bg-surface-soft" />
        ) : error ? (
          <div className="border border-error bg-surface-soft p-4" role="alert">
            <p className="body-sm text-error">{error}</p>
          </div>
        ) : (
          <Photo src={url} alt={title} fallbackLabel={title} aspectClass="aspect-[4/3]" />
        )}
      </div>
    </Modal>
  )
}

export default DocumentPreviewModal
