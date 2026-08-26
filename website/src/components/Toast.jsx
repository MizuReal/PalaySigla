import Icon from './Icon.jsx'
import { TOAST_VARIANTS } from '../context/toastContext.js'

const VARIANT_STYLES = Object.freeze({
  [TOAST_VARIANTS.SUCCESS]: { border: 'border-primary', icon: 'check', iconClass: 'text-primary' },
  [TOAST_VARIANTS.INFO]: { border: 'border-hairline', icon: 'info', iconClass: 'text-ink' },
  [TOAST_VARIANTS.ERROR]: { border: 'border-error', icon: 'close', iconClass: 'text-error' },
})

function Toast({ toast, onDismiss }) {
  const style = VARIANT_STYLES[toast.variant]
  return (
    <div
      className={`pointer-events-auto flex w-full items-start gap-3 border bg-canvas p-4 ${style.border}`}
    >
      <Icon name={style.icon} className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`} />
      <p className="body-sm flex-1 text-ink">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex h-8 w-8 shrink-0 items-center justify-center text-mute transition-colors hover:text-ink"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  )
}

export default Toast
