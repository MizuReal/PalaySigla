// Credentials nudge — once per account after signup/verification, mirroring
// the web modal. Dismissal is persisted per user in AsyncStorage.
import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import Button from './Button'
import { useAuth } from '../context/authContext'
import {
  hasSeenProfileNudge,
  markProfileNudgeSeen,
  subscribeToProfileNudge,
} from '../utils/profileNudge'
import { COLORS, GUTTER, SPACING, TYPE } from '../theme/designTokens'

interface ProfileNudgeModalProps {
  onOpenProfile: () => void
}

function ProfileNudgeModal({ onOpenProfile }: ProfileNudgeModalProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const userRef = useRef<User | null>(user)

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => subscribeToProfileNudge(() => setIsPending(true)), [])

  useEffect(() => {
    if (!isPending) {
      return undefined
    }
    const currentUser = userRef.current
    if (!currentUser) {
      return undefined
    }
    let isCurrent = true
    hasSeenProfileNudge(currentUser.id).then((seen) => {
      if (!isCurrent) {
        return
      }
      setIsPending(false)
      if (!seen) {
        setIsOpen(true)
      }
    })
    return () => {
      isCurrent = false
    }
  }, [isPending, user])

  const dismiss = () => {
    const currentUser = userRef.current
    if (currentUser) {
      void markProfileNudgeSeen(currentUser.id)
    }
    setIsOpen(false)
  }

  if (!isOpen || !user) {
    return null
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <Text style={[TYPE.captionMd, styles.eyebrow]}>Farmer verification</Text>
          <Text style={[TYPE.headingMd, styles.title]}>Add your credentials</Text>
          <Text style={[TYPE.bodySm, styles.copy]}>
            For easier transaction and to be credible, please visit your profile and
            add credentials.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Go to my profile"
              fullWidth
              onPress={() => {
                dismiss()
                onOpenProfile()
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={dismiss}
              style={({ pressed }) => [styles.later, pressed && styles.pressedDim]}
            >
              <Text style={[TYPE.bodyStrong, styles.laterLabel]}>Later</Text>
            </Pressable>
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
    maxWidth: 448,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
  },
  eyebrow: {
    color: COLORS.primary,
  },
  title: {
    color: COLORS.ink,
    marginTop: SPACING.sm,
  },
  copy: {
    color: COLORS.body,
    marginTop: SPACING.md,
  },
  actions: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  later: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterLabel: {
    color: COLORS.ink,
  },
  pressedDim: {
    opacity: 0.6,
  },
})

export default ProfileNudgeModal
