// 64x48 signed-URL thumbnail that opens the shared preview modal. Used by the
// owner record rows and the public wall cards.
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Icon from '../Icon'
import Photo from '../Photo'
import DocumentPreviewModal from './DocumentPreviewModal'
import { getCredentialDocumentUrl } from '../../services/credentials'
import { COLORS, SPACING } from '../../theme/designTokens'

interface CertificateThumbnailProps {
  storagePath: string
  title: string
}

function CertificateThumbnail({ storagePath, title }: CertificateThumbnailProps) {
  const [url, setUrl] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      try {
        const signed = await getCredentialDocumentUrl(storagePath)
        if (isCurrent) {
          setUrl(signed)
        }
      } catch {
        if (isCurrent) {
          setUrl('')
        }
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [storagePath])

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${title}`}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.thumb, pressed && styles.dim]}
      >
        {url ? (
          <Photo uri={url} alt={title} fallbackLabel={title} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="camera" size={18} color={COLORS.mute} />
          </View>
        )}
      </Pressable>
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

const styles = StyleSheet.create({
  thumb: {
    width: 64,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    marginTop: SPACING.xxs,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    opacity: 0.6,
  },
})

export default CertificateThumbnail
