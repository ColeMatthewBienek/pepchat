import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

/**
 * Base button component used throughout the app.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:
      'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white',
    ghost:
      'bg-transparent hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)]',
    danger:
      'bg-[var(--danger)] hover:bg-[var(--danger)]/80 text-white',
  }

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1',
    md: 'text-sm px-3 py-2 gap-1.5',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
