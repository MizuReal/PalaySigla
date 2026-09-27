import Icon from '../Icon'
import { HISTORY_STATUSES } from '../../utils/historyStatus'
import type { HistoryStatus } from '../../utils/historyStatus'

const STATUS_LABELS: Record<HistoryStatus, string> = Object.freeze({
  [HISTORY_STATUSES.ACTIVE]: 'Active',
  [HISTORY_STATUSES.RESERVED]: 'Reserved',
  [HISTORY_STATUSES.SOLD]: 'Sold',
  [HISTORY_STATUSES.DELETED]: 'Deleted',
})

const STATUS_CLASSES: Record<HistoryStatus, string> = Object.freeze({
  [HISTORY_STATUSES.ACTIVE]:
    'border-success-deep/40 bg-accent-leaf-pale text-success-deep',
  [HISTORY_STATUSES.RESERVED]:
    'border-warning-bright bg-accent-yellow-pale text-ink',
  [HISTORY_STATUSES.SOLD]: 'border-hairline bg-surface-soft text-ink',
  [HISTORY_STATUSES.DELETED]: 'border-hairline bg-surface-soft text-mute',
})

interface StatusChipProps {
  status: HistoryStatus
  label?: string
}

function StatusChip({ status, label }: StatusChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2.5 py-1 caption-sm ${STATUS_CLASSES[status]}`}
    >
      {status === HISTORY_STATUSES.SOLD && (
        <Icon name="check" className="h-3.5 w-3.5 shrink-0" />
      )}
      {label ?? STATUS_LABELS[status]}
    </span>
  )
}

export default StatusChip
