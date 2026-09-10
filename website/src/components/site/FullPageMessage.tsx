import type { ReactNode } from 'react'
import Icon from '../Icon.jsx'
import type { IconName } from '../Icon.jsx'

interface FullPageMessageProps {
  icon?: IconName | null
  title: string
  message: string
  tone?: 'neutral' | 'error'
  actions?: ReactNode
}

function FullPageMessage({
  icon = null,
  title,
  message,
  tone = 'neutral',
  actions = null,
}: FullPageMessageProps) {
  const isError = tone === 'error'
  const borderClass = isError ? 'border-error' : 'border-hairline'
  const iconColorClass = isError ? 'text-error' : 'text-primary'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div
        role={isError ? 'alert' : undefined}
        className={`w-full max-w-md border bg-surface-soft px-8 py-12 text-center sm:px-12 ${borderClass}`}
      >
        {icon && (
          <Icon name={icon} className={`mx-auto h-10 w-10 ${iconColorClass}`} />
        )}
        <h1 className="heading-lg mt-6 text-ink">{title}</h1>
        <p className="body-md mt-4 text-body">{message}</p>
        {actions && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </main>
  )
}

export default FullPageMessage
