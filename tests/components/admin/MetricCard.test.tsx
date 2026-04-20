import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetricCard from '@/components/admin/MetricCard'

describe('MetricCard', () => {
  it('renders the label', () => {
    render(<MetricCard label="Total Users" value={140} />)
    expect(screen.getByText('Total Users')).toBeTruthy()
  })

  it('renders the numeric value', () => {
    render(<MetricCard label="Total Users" value={140} />)
    expect(screen.getByText('140')).toBeTruthy()
  })

  it('renders zero value', () => {
    render(<MetricCard label="Messages Today" value={0} />)
    expect(screen.getByText('0')).toBeTruthy()
  })

  it('renders — when value is null (loading)', () => {
    render(<MetricCard label="Total Users" value={null} />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('applies data-testid based on label', () => {
    render(<MetricCard label="Active Today" value={32} />)
    expect(document.querySelector('[data-testid="metric-card"]')).toBeTruthy()
  })
})
