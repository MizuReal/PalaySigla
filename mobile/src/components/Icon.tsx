// Decorative stroke icon set ported from the website's Icon.tsx (same 24px
// viewBox, 1.8 stroke, round joins) so glyph geometry stays identical across
// surfaces. Icons are aria-hidden equivalents: they never announce alone and
// always sit beside text.
import type { ReactElement } from 'react'
import { Circle, Path, Rect, Svg } from 'react-native-svg'
import { COLORS } from '../theme/designTokens'

interface GlyphProps {
  color: string
  filled?: boolean
}

const strokeProps = (color: string) => ({
  stroke: color,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
})

const filledDotProps = (color: string) => ({ fill: color, stroke: 'none' })

function CameraGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Rect x="3" y="7" width="18" height="14" rx="2" {...strokeProps(color)} />
      <Circle cx="12" cy="14" r="3.5" {...strokeProps(color)} />
      <Path d="M8.5 7l1.5-3.5h4L15.5 7" {...strokeProps(color)} />
    </>
  )
}

function ScanGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M3 8V5a2 2 0 0 1 2-2h3" {...strokeProps(color)} />
      <Path d="M16 3h3a2 2 0 0 1 2 2v3" {...strokeProps(color)} />
      <Path d="M21 16v3a2 2 0 0 1-2 2h-3" {...strokeProps(color)} />
      <Path d="M8 21H5a2 2 0 0 1-2-2v-3" {...strokeProps(color)} />
      <Path d="M4 12h16" {...strokeProps(color)} />
    </>
  )
}

function QualityGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M4 14a8 8 0 1 1 16 0" {...strokeProps(color)} />
      <Path d="M12 14l4-4" {...strokeProps(color)} />
      <Circle cx="12" cy="14" r="1.5" {...filledDotProps(color)} />
    </>
  )
}

function MoldGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path
        d="M12 3.5c3 4 6 7 6 11a6 6 0 1 1-12 0c0-4 3-7 6-11z"
        {...strokeProps(color)}
      />
      <Circle cx="10.5" cy="13" r="0.5" {...filledDotProps(color)} />
      <Circle cx="13" cy="16" r="0.5" {...filledDotProps(color)} />
    </>
  )
}

function GradeGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M3 3h8l10 10-8 8L3 11V3z" {...strokeProps(color)} />
      <Circle cx="7.5" cy="7.5" r="1.5" {...filledDotProps(color)} />
    </>
  )
}

function VarietyGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M5 19c0-10 7-15 15-15 0 9-5 15-15 15z" {...strokeProps(color)} />
      <Path d="M6 18c3-4 6-6 9-7" {...strokeProps(color)} />
      <Path d="M3.5 21.5h9" {...strokeProps(color)} />
    </>
  )
}

function CheckGlyph({ color }: GlyphProps): ReactElement {
  return <Path d="M5 13l4 4L19 7" {...strokeProps(color)} />
}

function CloseGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M6 6l12 12" {...strokeProps(color)} />
      <Path d="M18 6L6 18" {...strokeProps(color)} />
    </>
  )
}

function InfoGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Circle cx="12" cy="12" r="9" {...strokeProps(color)} />
      <Path d="M12 11v5" {...strokeProps(color)} />
      <Circle cx="12" cy="8" r="0.5" {...filledDotProps(color)} />
    </>
  )
}

function ShieldGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z" {...strokeProps(color)} />
      <Path d="M9 12l2 2 4-4" {...strokeProps(color)} />
    </>
  )
}

function ScaleGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M12 3v18" {...strokeProps(color)} />
      <Path d="M8 21h8" {...strokeProps(color)} />
      <Path d="M12 7a3 3 0 0 0-3 3h6a3 3 0 0 0-3-3z" {...strokeProps(color)} />
      <Path d="M4 6l-1.5 6.5" {...strokeProps(color)} />
      <Path d="M20 6l1.5 6.5" {...strokeProps(color)} />
      <Path d="M2.5 12.5a4 4 0 0 0 8 0" {...strokeProps(color)} />
      <Path d="M13.5 12.5a4 4 0 0 0 8 0" {...strokeProps(color)} />
    </>
  )
}

function ChevronLeftGlyph({ color }: GlyphProps): ReactElement {
  return <Path d="M15 5l-7 7 7 7" {...strokeProps(color)} />
}

function ChevronRightGlyph({ color }: GlyphProps): ReactElement {
  return <Path d="M9 5l7 7-7 7" {...strokeProps(color)} />
}

function ChevronDownGlyph({ color }: GlyphProps): ReactElement {
  return <Path d="M5 9l7 7 7-7" {...strokeProps(color)} />
}

function ChevronUpGlyph({ color }: GlyphProps): ReactElement {
  return <Path d="M19 15l-7-7-7 7" {...strokeProps(color)} />
}

function PinGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z" {...strokeProps(color)} />
      <Circle cx="12" cy="10" r="2.5" {...strokeProps(color)} />
    </>
  )
}

function MarketplaceGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" {...strokeProps(color)} />
      <Path d="M3 6h18" {...strokeProps(color)} />
      <Path d="M16 10a4 4 0 0 1-8 0" {...strokeProps(color)} />
    </>
  )
}

function CommunityGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...strokeProps(color)} />
      <Circle cx="9" cy="7" r="4" {...strokeProps(color)} />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...strokeProps(color)} />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...strokeProps(color)} />
    </>
  )
}

function SettingsGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M4 21v-7" {...strokeProps(color)} />
      <Path d="M4 10V3" {...strokeProps(color)} />
      <Path d="M12 21v-9" {...strokeProps(color)} />
      <Path d="M12 8V3" {...strokeProps(color)} />
      <Path d="M20 21v-5" {...strokeProps(color)} />
      <Path d="M20 12V3" {...strokeProps(color)} />
      <Path d="M1 14h6" {...strokeProps(color)} />
      <Path d="M9 8h6" {...strokeProps(color)} />
      <Path d="M17 16h6" {...strokeProps(color)} />
    </>
  )
}

function LogoutGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...strokeProps(color)} />
      <Path d="M16 17l5-5-5-5" {...strokeProps(color)} />
      <Path d="M21 12H9" {...strokeProps(color)} />
    </>
  )
}

function LoginGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" {...strokeProps(color)} />
      <Path d="M10 17l5-5-5-5" {...strokeProps(color)} />
      <Path d="M15 12H3" {...strokeProps(color)} />
    </>
  )
}

function ChatGlyph({ color }: GlyphProps): ReactElement {
  return (
    <Path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" {...strokeProps(color)} />
  )
}

function SendGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M22 2l-7 20-4-9-9-4 20-7z" {...strokeProps(color)} />
      <Path d="M22 2 11 13" {...strokeProps(color)} />
    </>
  )
}

function TrashGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M3 6h18" {...strokeProps(color)} />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...strokeProps(color)} />
      <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" {...strokeProps(color)} />
      <Path d="M10 11v6" {...strokeProps(color)} />
      <Path d="M14 11v6" {...strokeProps(color)} />
    </>
  )
}

function SproutGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M12 21v-9" {...strokeProps(color)} />
      <Path d="M12 12C8 12 5.5 9.5 5.5 5.5 9.5 5.5 12 8 12 12z" {...strokeProps(color)} />
      <Path d="M12 12c0-3.5 2.3-6 6.5-6 0 3.5-2.3 6-6.5 6z" {...strokeProps(color)} />
    </>
  )
}

function BugGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Circle cx="12" cy="13" r="5.5" {...strokeProps(color)} />
      <Path d="M9.2 8.7 7.3 5.8" {...strokeProps(color)} />
      <Path d="M14.8 8.7l1.9-2.9" {...strokeProps(color)} />
      <Path d="M12 7.5v11" {...strokeProps(color)} />
      <Path d="M6.8 10.8H3.5" {...strokeProps(color)} />
      <Path d="M20.5 10.8h-3.3" {...strokeProps(color)} />
      <Path d="M6.8 15.4H4" {...strokeProps(color)} />
      <Path d="M20 15.4h-2.8" {...strokeProps(color)} />
    </>
  )
}

function BasketGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M4 10h16" {...strokeProps(color)} />
      <Path
        d="M5.5 10l1.3 8.3a2 2 0 0 0 2 1.7h6.4a2 2 0 0 0 2-1.7L18.5 10"
        {...strokeProps(color)}
      />
      <Path d="M8.5 10a3.5 3.5 0 0 1 7 0" {...strokeProps(color)} />
      <Path d="M9.5 13.5v3" {...strokeProps(color)} />
      <Path d="M14.5 13.5v3" {...strokeProps(color)} />
    </>
  )
}

function DropGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path
        d="M12 3.5c3 3.8 6 6.8 6 10.5a6 6 0 0 1-12 0c0-3.7 3-6.7 6-10.5z"
        {...strokeProps(color)}
      />
      <Path d="M8.5 14.5c1.2.9 2.3.9 3.5 0s2.3-.9 3.5 0" {...strokeProps(color)} />
    </>
  )
}

function HeartGlyph({ color, filled = false }: GlyphProps): ReactElement {
  return (
    <Path
      d="M12 20.5S4.5 15.8 2.7 11.3C1.4 8 3.4 4.5 7 4.5c2 0 3.7 1.1 5 2.9 1.3-1.8 3-2.9 5-2.9 3.6 0 5.6 3.5 4.3 6.8C19.5 15.8 12 20.5 12 20.5z"
      {...(filled ? { fill: color, stroke: 'none' } : strokeProps(color))}
    />
  )
}

function StarGlyph({ color, filled = false }: GlyphProps): ReactElement {
  return (
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      {...(filled ? { fill: color, stroke: 'none' } : strokeProps(color))}
    />
  )
}

function PlusGlyph({ color }: GlyphProps): ReactElement {
  return (
    <>
      <Path d="M12 5v14" {...strokeProps(color)} />
      <Path d="M5 12h14" {...strokeProps(color)} />
    </>
  )
}

const ICON_GLYPHS = {
  camera: CameraGlyph,
  scan: ScanGlyph,
  quality: QualityGlyph,
  mold: MoldGlyph,
  grade: GradeGlyph,
  variety: VarietyGlyph,
  check: CheckGlyph,
  close: CloseGlyph,
  info: InfoGlyph,
  shield: ShieldGlyph,
  scale: ScaleGlyph,
  'chevron-left': ChevronLeftGlyph,
  'chevron-right': ChevronRightGlyph,
  'chevron-down': ChevronDownGlyph,
  'chevron-up': ChevronUpGlyph,
  pin: PinGlyph,
  marketplace: MarketplaceGlyph,
  community: CommunityGlyph,
  settings: SettingsGlyph,
  logout: LogoutGlyph,
  login: LoginGlyph,
  chat: ChatGlyph,
  send: SendGlyph,
  trash: TrashGlyph,
  sprout: SproutGlyph,
  bug: BugGlyph,
  basket: BasketGlyph,
  drop: DropGlyph,
  heart: HeartGlyph,
  star: StarGlyph,
  plus: PlusGlyph,
}

export type IconName = keyof typeof ICON_GLYPHS

interface IconProps {
  name: IconName
  size?: number
  color?: string
  filled?: boolean
}

function Icon({ name, size = 24, color = COLORS.primary, filled = false }: IconProps) {
  const Glyph = ICON_GLYPHS[name]
  if (!Glyph) {
    // JS callers can still pass an unknown name at runtime
    throw new Error(`Unknown icon name: "${name}"`)
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Glyph color={color} filled={filled} />
    </Svg>
  )
}

export default Icon
