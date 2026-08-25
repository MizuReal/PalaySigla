import Icon from './Icon.jsx'

const VARIANT_CLASSES = {
  primary: 'bg-primary text-on-primary hover:bg-primary-dark',
  outline: 'border-2 border-primary text-ink hover:border-primary-dark',
  ghost: 'h-auto px-0 py-0 text-primary hover:text-primary-dark',
}

const BASE_CLASSES =
  'inline-flex h-11 items-center justify-center gap-2 rounded-sm px-6 py-[11px] button-md transition-colors duration-150'

function Button({ variant = 'primary', href = '#', className = '', children }) {
  return (
    <a
      href={href}
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
      {variant === 'ghost' && <Icon name="arrow-right" className="h-4 w-4" />}
    </a>
  )
}

export default Button
