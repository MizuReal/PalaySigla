import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

const VARIANT_CLASSES = {
  primary: 'bg-primary text-on-primary hover:bg-primary-dark',
  outline: 'border-2 border-primary text-ink hover:border-primary-dark',
  ghost: 'h-auto px-0 py-0 text-primary hover:text-primary-dark',
}

const BASE_CLASSES =
  'inline-flex h-11 items-center justify-center gap-2 rounded-sm px-6 py-[11px] button-md transition-colors duration-150'

const DISABLED_CLASSES = 'bg-surface-soft text-ash hover:bg-surface-soft'

function Button({
  variant = 'primary',
  href = '#',
  to,
  type,
  onClick,
  disabled = false,
  className = '',
  children,
}) {
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className} ${
    disabled ? DISABLED_CLASSES : ''
  }`
  const trailingIcon =
    variant === 'ghost' ? <Icon name="arrow-right" className="h-4 w-4" /> : null

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
        {trailingIcon}
      </Link>
    )
  }

  if (type === 'submit' || type === 'button' || onClick) {
    return (
      <button type={type ?? 'button'} onClick={onClick} disabled={disabled} className={classes}>
        {children}
        {trailingIcon}
      </button>
    )
  }

  return (
    <a href={href} className={classes}>
      {children}
      {trailingIcon}
    </a>
  )
}

export default Button
