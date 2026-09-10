export function pillTabClasses(isActive) {
  return `rounded-sm border px-4 py-2.5 button-sm transition-colors ${
    isActive
      ? 'border-ink bg-ink text-on-dark'
      : 'border-hairline bg-canvas text-ink hover:border-primary hover:text-primary'
  }`
}
