import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChatSurfaceSkeleton, SkeletonBlock } from '@/components/ui/Skeleton'

describe('Skeleton UI primitives', () => {
  it('renders neutral aria-hidden skeleton blocks', () => {
    render(<SkeletonBlock className="h-4 w-12" />)

    const block = document.querySelector('.skeleton-pulse')
    expect(block).toHaveAttribute('aria-hidden', 'true')
    expect(block).toHaveClass('h-4')
    expect(block).toHaveClass('w-12')
  })

  it('renders a chat-shaped loading surface without message text', () => {
    render(<ChatSurfaceSkeleton variant="dm" />)

    expect(screen.getByLabelText('Loading conversation')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText(/loading conversation/i)).toBeNull()
    expect(document.querySelectorAll('.skeleton-pulse').length).toBeGreaterThan(8)
  })
})
