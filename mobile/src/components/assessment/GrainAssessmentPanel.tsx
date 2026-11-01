// Grain assessment flow: capture → upload → reviewable result, with the same
// sign-in gating and retry semantics as the sheet scan.
import { useCallback } from 'react'
import { Image as ExpoImage } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import Button from '../Button'
import AssessmentCapturePanel from './AssessmentCapturePanel'
import AssessmentResultsCard from './AssessmentResultsCard'
import useAssessmentCapture from '../../hooks/useAssessmentCapture'
import { AUTH_MODAL_MODES, useAuth } from '../../context/authContext'
import { COLORS, GUTTER, SPACING, TYPE } from '../../theme/designTokens'

const API_URL = process.env.EXPO_PUBLIC_API_URL
const PREVIEW_MAX_HEIGHT = 260

function GrainAssessmentPanel() {
  const { user, openAuthModal } = useAuth()
  const {
    image,
    status,
    result,
    error,
    isProcessing,
    canOpenSettings,
    takePhoto,
    pickFromLibrary,
    retry,
    reset,
    openSettings,
  } = useAssessmentCapture()

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

  const handleRetake = useCallback(() => {
    reset()
  }, [reset])

  const isBusy = status === 'uploading' || isProcessing
  const isResult = status === 'result' && result !== null && image !== null

  return (
    <View style={styles.panel}>
      {isResult ? (
        <AssessmentResultsCard
          data={result}
          imageUri={image.uri}
          imageWidth={image.width}
          imageHeight={image.height}
          onRetake={handleRetake}
        />
      ) : (
        <>
          {image ? (
            <ExpoImage
              source={{ uri: image.uri }}
              style={styles.preview}
              contentFit="contain"
              accessibilityLabel="Captured paddy sample"
            />
          ) : null}
          {status === 'uploading' ? (
            <Text style={[TYPE.bodySm, styles.statusLine]}>Scanning the sample…</Text>
          ) : null}
          <AssessmentCapturePanel
            isBusy={isBusy}
            onTakePhoto={handleTakePhoto}
            onPickFromLibrary={handlePickFromLibrary}
            onOpenSettings={
              canOpenSettings
                ? () => {
                    void openSettings()
                  }
                : null
            }
          />
        </>
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
          {__DEV__ && API_URL ? (
            <Text style={[TYPE.captionSm, styles.debugCaption]}>API: {API_URL}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: GUTTER,
    paddingBottom: SPACING.xxl + SPACING.lg,
    alignSelf: 'stretch',
  },
  preview: {
    width: '100%',
    maxHeight: PREVIEW_MAX_HEIGHT,
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.surfaceSoft,
    marginTop: SPACING.xl,
  },
  statusLine: {
    color: COLORS.mute,
    marginTop: SPACING.md,
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
  debugCaption: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
})

export default GrainAssessmentPanel
