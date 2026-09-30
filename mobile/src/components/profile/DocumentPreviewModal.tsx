// Full-panel document preview — the mobile port of the web preview modal.
// Signs the private object on open; the storage policies decide who succeeds.
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Icon from '../Icon'
import Photo from '../Photo'
import { getCredentialDocumentUrl } from '../../services/credentials'
import { COLORS, GUTTER, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

interface DocumentPreviewModalProps {
  storagePath: string
  title: string
  onClose: () => void
}

function DocumentPreviewModal({
  storagePath,
  title,
  onClose,
}: DocumentPreviewModalProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const signed = await getCredentialDocumentUrl(storagePath)
        if (isCurrent) {
          setUrl(signed)
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error ? err.message : 'Could not load the document.'
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
  }, [storagePath])

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={[TYPE.headingSm, styles.title]} numberOfLines={2}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close preview"
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.dim]}
            >
              <Icon name="close" size={22} color={COLORS.ink} />
            </Pressable>
          </View>
          <View style={styles.body}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : error ? (
              <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.error]}>
                {error}
              </Text>
            ) : (
              <Photo
                uri={url}
                alt={title}
                fallbackLabel={title}
                style={styles.image}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: GUTTER,
  },
  panel: {
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  title: {
    flex: 1,
    color: COLORS.ink,
  },
  close: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -SPACING.sm,
    marginRight: -SPACING.sm,
  },
  body: {
    marginTop: SPACING.md,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  error: {
    color: COLORS.error,
    textAlign: 'center',
  },
  dim: {
    opacity: 0.6,
  },
})

export default DocumentPreviewModal
