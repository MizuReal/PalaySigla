// Bottom offset for an assistant bottom sheet: above the tab bar while idle,
// or just above the keyboard while typing. iOS modals do not resize for the
// keyboard; Android's adjustResize only needs a small gap.
import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'
import type { KeyboardEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TAB_BAR_HEIGHT } from '../components/AppTabBar'
import { SPACING } from '../theme/designTokens'

const KEYBOARD_OPEN_BOTTOM_GAP_IOS = SPACING.sm
const KEYBOARD_OPEN_BOTTOM_GAP_ANDROID = SPACING.lg + SPACING.sm

export function useChatSheetBottomGap(isOpen: boolean): number {
  const insets = useSafeAreaInsets()
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const handleShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height)
    }
    const handleHide = () => {
      setKeyboardHeight(0)
    }
    const showSubscription = Keyboard.addListener(showEvent, handleShow)
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide)
    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [isOpen])

  if (keyboardHeight > 0) {
    return Platform.OS === 'ios'
      ? keyboardHeight + KEYBOARD_OPEN_BOTTOM_GAP_IOS
      : KEYBOARD_OPEN_BOTTOM_GAP_ANDROID + insets.bottom
  }
  return TAB_BAR_HEIGHT + insets.bottom + SPACING.lg
}
