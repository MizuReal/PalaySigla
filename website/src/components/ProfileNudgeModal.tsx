import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import Button from './Button'
import Modal from './Modal'
import { useAuth } from '../context/authContext'
import {
  hasSeenProfileNudge,
  markProfileNudgeSeen,
  subscribeToProfileNudge,
} from '../utils/profileNudge'

const TITLE_ID = 'profile-nudge-title'

interface ProfileNudgeModalProps {
  onOpenProfile: () => void
}

// Reminder shown once per account after signup/verification: credentials live
// on the profile, not in the registration form. The dismissal is per-user and
// stored locally, matching the chat history precedent.
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
      return
    }
    const currentUser = userRef.current
    if (!currentUser) {
      return
    }
    setIsPending(false)
    if (!hasSeenProfileNudge(currentUser.id)) {
      setIsOpen(true)
    }
  }, [isPending, user])

  const dismiss = () => {
    const currentUser = userRef.current
    if (currentUser) {
      markProfileNudgeSeen(currentUser.id)
    }
    setIsOpen(false)
  }

  if (!isOpen || !user) {
    return null
  }

  return (
    <Modal onClose={dismiss} labelledBy={TITLE_ID}>
      <p className="caption-md text-primary">Farmer verification</p>
      <h2 id={TITLE_ID} className="heading-md mt-2 text-ink">
        Add your credentials
      </h2>
      <p className="body-sm mt-3 text-body">
        For easier transaction and to be credible, please visit your profile and
        add credentials.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => {
            dismiss()
            onOpenProfile()
          }}
          className="justify-center"
        >
          Go to my profile
        </Button>
        <Button
          variant="outline"
          onClick={dismiss}
          className="justify-center"
        >
          Later
        </Button>
      </div>
    </Modal>
  )
}

export default ProfileNudgeModal
