import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'icon' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  const variants: Record<string, string> = {
    primary: 'primary bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-none',
    ghost:   'ghost bg-transparent text-[var(--text-muted)] border border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
    icon:    'icon bg-transparent text-[var(--text-muted)] border-none hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] p-[6px]',
    danger:  'bg-[var(--danger)] hover:bg-[var(--danger)]/80 text-white border-none',
  }

  const sizes: Record<string, string> = {
    sm: 'btn-sm text-[12px] px-3 py-1.5 gap-1',
    md: 'btn-md text-[13px] px-4 py-2 gap-1.5',
    lg: 'btn-lg text-[14px] px-5 py-2.5 gap-2',
  }

  const sizeClass = variant === 'icon' ? '' : sizes[size]

  return (
    <button
      className={`${base} ${variants[variant] ?? variants.primary} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
