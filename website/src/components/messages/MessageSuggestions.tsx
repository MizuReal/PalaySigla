import { INQUIRY_SUGGESTIONS } from '../../utils/messageSuggestions'

interface MessageSuggestionsProps {
  onSelect: (text: string) => void
  disabled?: boolean
}

// Buyer opener chips shown on an empty listing thread; tapping one sends the
// question as the first message.
function MessageSuggestions({ onSelect, disabled = false }: MessageSuggestionsProps) {
  return (
    <ul className="mt-4 flex flex-wrap justify-center gap-2">
      {INQUIRY_SUGGESTIONS.map((suggestion) => (
        <li key={suggestion}>
          <button
            type="button"
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
            className="flex min-h-11 items-center rounded-sm border border-hairline bg-canvas px-4 body-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:border-hairline disabled:text-ash"
          >
            {suggestion}
          </button>
        </li>
      ))}
    </ul>
  )
}

export default MessageSuggestions
