import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '@/components/ui/Button'

describe('Button — variants', () => {
  it('renders primary variant by default', () => {
    render(<Button>Save</Button>)
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveClass('primary')
  })

  it('renders ghost variant with border', () => {
    render(<Button variant="ghost">Cancel</Button>)
    const btn = screen.getByRole('button', { name: 'Cancel' })
    expect(btn).toHaveClass('ghost')
  })

  it('renders icon variant', () => {
    render(<Button variant="icon"><span>✕</span></Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('icon')
  })
})

describe('Button — sizes', () => {
  it('applies sm padding class', () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-sm')
  })

  it('applies md padding class', () => {
    render(<Button size="md">Medium</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-md')
  })

  it('applies lg padding class', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-lg')
  })
})

describe('Button — behaviour', () => {
  it('calls onClick when clicked', async () => {
    const handler = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={handler}>Click me</Button>)
    await user.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const handler = vi.fn()
    const user = userEvent.setup()
    render(<Button disabled onClick={handler}>Save</Button>)
    await user.click(screen.getByRole('button'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('renders as submit button when type=submit', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})
