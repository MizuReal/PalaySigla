import { useState } from 'react'
import type { FormEvent } from 'react'
import Icon from '../Icon'
import { MESSAGE_MAX_CHARS } from '../../services/messaging'

interface MessageComposerProps {
  onSend: (body: string) => void
  isSending: boolean
  error: string
}

function MessageComposer({ onSend, isSending, error }: MessageComposerProps) {
  const [value, setValue] = useState('')
  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && !isSending

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSend) {
      return
    }
    onSend(trimmed)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-hairline pt-4">
      {error && (
        <p
          role="alert"
          className="mb-3 border border-error bg-surface-soft px-4 py-3 body-sm text-ink"
        >
          {error}
        </p>
      )}
      <div className="flex items-end gap-3">
        <label htmlFor="message-composer-input" className="sr-only">
          Message
        </label>
        <input
          id="message-composer-input"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={MESSAGE_MAX_CHARS}
          placeholder="Write a message…"
          className="h-11 w-full rounded-sm border border-hairline bg-canvas px-4 body-md text-ink outline-none transition-colors focus:border-2 focus:border-primary"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-primary text-on-primary transition-colors hover:bg-primary-dark disabled:bg-surface-soft disabled:text-ash"
        >
          <Icon name="send" className="h-5 w-5" />
        </button>
      </div>
    </form>
  )
}

export default MessageComposer
