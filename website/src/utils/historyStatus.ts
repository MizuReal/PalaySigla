export const HISTORY_STATUSES = Object.freeze({
  ACTIVE: 'active',
  RESERVED: 'reserved',
  SOLD: 'sold',
  DELETED: 'deleted',
} as const)

export type HistoryStatus = (typeof HISTORY_STATUSES)[keyof typeof HISTORY_STATUSES]
