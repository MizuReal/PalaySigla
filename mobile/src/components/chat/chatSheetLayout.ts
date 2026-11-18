// Shared geometry for assistant bottom sheets.
import { SPACING } from '../../theme/designTokens'

export const CHAT_SHEET_MAX_HEIGHT = 512
export const CHAT_SHEET_MIN_HEIGHT = 320
export const CHAT_SHEET_SIDE_GUTTER = SPACING.xl
export const CHAT_BRAND_TILE_SIZE = 40
export const CHAT_SHEET_SHADOW_RADIUS = 5
export const CHAT_SHEET_SHADOW_OPACITY = 0.3
export const CHAT_SHEET_ELEVATION = 5
export const CHAT_SHEET_BACKDROP_COLOR = 'rgba(26, 26, 26, 0.35)'
const SHEET_TOP_AIR = SPACING.md

export function chatSheetHeight(windowHeight: number, bottomGap: number): number {
  return Math.min(
    CHAT_SHEET_MAX_HEIGHT,
    Math.max(CHAT_SHEET_MIN_HEIGHT, Math.round(windowHeight - bottomGap - SHEET_TOP_AIR))
  )
}
