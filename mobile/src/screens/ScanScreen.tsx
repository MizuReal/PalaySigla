// Scan tab — the product's core act: photograph a filled PalaySigla sheet and
// review the six OCR'd measurements. Corrections are local to this phase;
// saving and assessment integration arrive later.
import { useCallback, useMemo, useState } from 'react'
import { Image as ExpoImage } from 'expo-image'
import { Linking, StyleSheet, Text, View } from 'react-native'
import Button from '../components/Button'
import ScanCapturePanel from '../components/scan/ScanCapturePanel'
import ScanResultsCard from '../components/scan/ScanResultsCard'
import TabScreen from '../components/TabScreen'
import useScanCapture from '../hooks/useScanCapture'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { COLORS, GUTTER, SPACING, TYPE } from '../theme/designTokens'

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL
const SHEET_PATH = '/palaysigla-scan-sheet.pdf'
const PREVIEW_MAX_HEIGHT = 260
const LINK_FAILED_MESSAGE = 'Could not open the scan sheet link.'

function ScanScreen() {
  const { user, openAuthModal } = useAuth()
  const {
    image,
    status,
    fields,
    computedRatio,
    overallNeedsReview,
    error: scanError,
    isProcessing,
    canOpenSettings,
    takePhoto,
    pickFromLibrary,
    retry,
    reset,
    updateFieldValue,
    openSettings,
  } = useScanCapture()
  const [linkError, setLinkError] = useState('')

  const sheetUrl = useMemo(() => {
    if (!WEB_URL) {
      return null
    }
    return `${WEB_URL.replace(/\/+$/, '')}${SHEET_PATH}`
  }, [])

  const requireSignInThen = useCallback(
    (action: () => void) => {
      if (!user) {
        openAuthModal(AUTH_MODAL_MODES.LOGIN)
        return
      }
      action()
    },
    [user, openAuthModal]
  )

  const handleTakePhoto = useCallback(() => {
    requireSignInThen(() => {
      void takePhoto()
    })
  }, [requireSignInThen, takePhoto])

  const handlePickFromLibrary = useCallback(() => {
    requireSignInThen(() => {
      void pickFromLibrary()
    })
  }, [requireSignInThen, pickFromLibrary])

  const handleOpenSheet = useCallback(async () => {
    if (!sheetUrl) {
      return
    }
    setLinkError('')
    try {
      await Linking.openURL(sheetUrl)
    } catch {
      setLinkError(LINK_FAILED_MESSAGE)
    }
  }, [sheetUrl])

  const error = scanError || linkError
  const isBusy = status === 'uploading' || isProcessing

  return (
    <TabScreen>
      <View style={styles.panel}>
        {image ? (
          <ExpoImage
            source={{ uri: image.uri }}
            style={styles.preview}
            contentFit="contain"
            accessibilityLabel="Captured scan sheet"
          />
        ) : null}
        {status === 'uploading' ? (
          <Text style={[TYPE.bodySm, styles.statusLine]}>Reading six values…</Text>
        ) : null}
        {status === 'review' ? (
          <ScanResultsCard
            fields={fields}
            computedRatio={computedRatio}
            overallNeedsReview={overallNeedsReview}
            onChangeValue={updateFieldValue}
            onRetake={reset}
          />
        ) : (
          <ScanCapturePanel
            sheetUrl={sheetUrl}
            isBusy={isBusy}
            onTakePhoto={handleTakePhoto}
            onPickFromLibrary={handlePickFromLibrary}
            onOpenSheet={() => {
              void handleOpenSheet()
            }}
            onOpenSettings={
              canOpenSettings
                ? () => {
                    void openSettings()
                  }
                : null
            }
          />
        )}
        {error ? (
          <View style={styles.errorPanel}>
            <Text style={[TYPE.bodySm, styles.errorText]}>{error}</Text>
            {status === 'error' ? (
              <View style={styles.errorAction}>
                <Button
                  label="Try again"
                  onPress={() => {
                    void retry()
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl + SPACING.lg,
    alignSelf: 'stretch',
  },
  preview: {
    width: '100%',
    maxHeight: PREVIEW_MAX_HEIGHT,
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.surfaceSoft,
    marginBottom: SPACING.lg,
  },
  statusLine: {
    color: COLORS.mute,
    marginBottom: SPACING.md,
  },
  errorPanel: {
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  errorText: {
    color: COLORS.body,
  },
  errorAction: {
    marginTop: SPACING.md,
  },
})

export default ScanScreen
