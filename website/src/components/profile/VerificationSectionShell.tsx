import type { ReactNode } from 'react'
import Button from '../Button'
import Icon from '../Icon'

export function SectionError({ message }: { message: string }) {
  return (
    <div
      className="mt-4 flex items-start gap-3 border border-error bg-surface-soft p-4"
      role="alert"
    >
      <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0 text-error" />
      <p className="body-sm text-ink">{message}</p>
    </div>
  )
}

interface VerificationSectionShellProps {
  title: string
  description: string
  addLabel: string
  isLocked: boolean
  isAddOpen: boolean
  onToggleAdd: () => void
  actionError: string
  hasItems: boolean
  emptyLabel: string
  list: ReactNode
  children: ReactNode
}

// Shared verification-record card: heading, lock notice, add form, existing
// records, and the action error banner. Every section keeps the same geometry
// so the panel reads as one system.
function VerificationSectionShell({
  title,
  description,
  addLabel,
  isLocked,
  isAddOpen,
  onToggleAdd,
  actionError,
  hasItems,
  emptyLabel,
  list,
  children,
}: VerificationSectionShellProps) {
  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="heading-sm text-ink">{title}</h3>
          <p className="body-sm mt-1 text-mute">{description}</p>
        </div>
        {!isLocked && (
          <Button
            variant="outline"
            type="button"
            onClick={onToggleAdd}
            className="shrink-0 justify-center"
          >
            {isAddOpen ? 'Cancel' : addLabel}
          </Button>
        )}
      </div>

      {isLocked && (
        <p className="caption-sm mt-4 flex items-start gap-1.5 border border-hairline bg-surface-soft p-3 text-mute">
          <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Your profile is verified, so these records are locked. Contact the review
          team if you need to correct them.
        </p>
      )}

      {isAddOpen && <div className="mt-5 border-t border-hairline pt-5">{children}</div>}

      {actionError ? <SectionError message={actionError} /> : null}

      <div className="mt-5">
        {hasItems ? (
          list
        ) : (
          <p className="caption-sm border border-hairline bg-surface-soft p-4 text-mute">
            {emptyLabel}
          </p>
        )}
      </div>
    </section>
  )
}

export default VerificationSectionShell
