export const FORM_FIELD_CLASSES =
  'h-11 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px]'

export const FORM_TEXTAREA_CLASSES =
  'w-full border border-hairline bg-canvas px-4 py-3 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px] focus:py-[11px]'

export function withFieldError(classes: string, hasError: boolean): string {
  return hasError ? `${classes} border-error` : classes
}
