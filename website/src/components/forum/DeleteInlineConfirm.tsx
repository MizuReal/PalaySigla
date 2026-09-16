interface DeleteInlineConfirmProps {
  prompt: string
  confirmLabel: string
  pendingLabel: string
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DeleteInlineConfirm({
  prompt,
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  onCancel,
}: DeleteInlineConfirmProps) {
  return (
    <div className="mt-3 border border-error bg-surface-soft p-4">
      <p className="body-sm text-ink">{prompt}</p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="h-11 border border-error px-5 button-sm text-error transition-colors hover:bg-error hover:text-on-dark disabled:text-ash"
        >
          {isPending ? pendingLabel : confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="h-11 border border-hairline bg-canvas px-5 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default DeleteInlineConfirm
