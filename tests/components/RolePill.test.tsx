import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RolePill from '@/components/ui/RolePill'

describe('RolePill', () => {
  it('renders nothing for user role', () => {
    const { container } = render(<RolePill role="user" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders admin pill with crown glyph and admin label', () => {
    render(<RolePill role="admin" />)
    const pill = screen.getByTestId('role-pill')
    expect(pill.textContent).toContain('♕')
    expect(pill.textContent).toContain('admin')
  })

  it('renders moderator pill with lightning glyph and mod label', () => {
    render(<RolePill role="moderator" />)
    const pill = screen.getByTestId('role-pill')
    expect(pill.textContent).toContain('⚡')
    expect(pill.textContent).toContain('mod')
  })

  it('renders noob pill with seedling glyph and new label', () => {
    render(<RolePill role="noob" />)
    const pill = screen.getByTestId('role-pill')
    expect(pill.textContent).toContain('🌱')
    expect(pill.textContent).toContain('new')
  })

  it('applies sm font size when size=sm', () => {
    render(<RolePill role="admin" size="sm" />)
    const pill = screen.getByTestId('role-pill')
    expect(pill.style.fontSize).toBe('10px')
  })

  it('applies md font size when size=md', () => {
    render(<RolePill role="admin" size="md" />)
    const pill = screen.getByTestId('role-pill')
    expect(pill.style.fontSize).toBe('11px')
  })

  it('admin pill uses gold tone color', () => {
    render(<RolePill role="admin" />)
    const pill = screen.getByTestId('role-pill')
    expect(pill.style.color).toBe('rgb(216, 154, 58)')
  })

  it('moderator pill uses purple tone color', () => {
    render(<RolePill role="moderator" />)
    const pill = screen.getByTestId('role-pill')
    expect(pill.style.color).toBe('rgb(192, 112, 160)')
  })
})
