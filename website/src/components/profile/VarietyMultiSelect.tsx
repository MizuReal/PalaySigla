import type { KeyboardEvent } from 'react'
import { FORM_FIELD_CLASSES, withFieldError } from '../../utils/formField'

interface VarietyMultiSelectProps {
  varieties: readonly string[]
  selected: readonly string[]
  customValue: string
  disabled?: boolean
  error?: string
  onToggle: (variety: string) => void
  onCustomChange: (value: string) => void
  onAddCustom: () => void
}

function VarietyMultiSelect({
  varieties,
  selected,
  customValue,
  disabled = false,
  error = '',
  onToggle,
  onCustomChange,
  onAddCustom,
}: VarietyMultiSelectProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onAddCustom()
    }
  }

  return (
    <div>
      <p className="caption-md text-ink">Rice varieties grown</p>
      {selected.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Selected varieties">
          {selected.map((variety) => (
            <li key={variety}>
              <button
                type="button"
                onClick={() => onToggle(variety)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-sm border border-primary bg-canvas px-2.5 py-1 caption-sm text-ink transition-colors hover:border-primary-dark disabled:text-ash"
                aria-label={`Remove ${variety}`}
              >
                {variety}
                <span aria-hidden="true" className="text-mute">
                  &times;
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="caption-sm mt-2 text-mute">
          Pick the varieties you cultivate, or add one that is missing.
        </p>
      )}

      <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto border border-hairline bg-canvas p-3 sm:grid-cols-2">
        {varieties.map((variety) => {
          const checked = selected.includes(variety)
          return (
            <label
              key={variety}
              className="flex min-w-0 cursor-pointer items-center gap-2 body-sm text-ink"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(variety)}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <span className="truncate">{variety}</span>
            </label>
          )
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={customValue}
          onChange={(event) => onCustomChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Other variety (e.g. Dinorado)"
          aria-label="Add another rice variety"
          className={withFieldError(FORM_FIELD_CLASSES, Boolean(error))}
        />
        <button
          type="button"
          onClick={onAddCustom}
          disabled={disabled || !customValue.trim()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
        >
          Add variety
        </button>
      </div>
      {error ? (
        <p className="caption-sm mt-2 text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default VarietyMultiSelect
