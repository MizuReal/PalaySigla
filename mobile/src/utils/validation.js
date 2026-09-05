// Shared field-validation patterns — verbatim port of the website's
// utils/validation.js so both surfaces enforce identical rules. These run
// client-side only; Supabase enforces the same bounds server-side.
export const NAME_PATTERN = /^[\p{L}\p{M}' .-]{2,60}$/u

export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
