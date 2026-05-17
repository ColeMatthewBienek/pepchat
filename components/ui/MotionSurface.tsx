'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface MotionSurfaceProps {
  children: ReactNode
  motionKey?: string
  direction?: 'forward' | 'back' | 'none'
  className?: string
}

export default function MotionSurface({
  children,
  motionKey,
  direction = 'forward',
  className = '',
}: MotionSurfaceProps) {
  const pathname = usePathname()
  const key = motionKey ?? pathname
  const motionClass = direction === 'none'
    ? 'route-surface-enter-none'
    : direction === 'back'
      ? 'route-surface-enter-back'
      : 'route-surface-enter'

  return (
    <div key={key} className={`${motionClass} ${className}`.trim()} data-motion-key={key}>
      {children}
    </div>
  )
}
