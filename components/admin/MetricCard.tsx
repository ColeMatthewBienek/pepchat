interface MetricCardProps {
  label: string
  value: number | null
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div
      data-testid="metric-card"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
      }}
    >
      <p style={{
        fontSize: 12,
        color: 'var(--text-faint)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        margin: '0 0 8px',
        fontWeight: 600,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 32,
        fontWeight: 700,
        color: 'var(--text-primary)',
        margin: 0,
        lineHeight: 1,
      }}>
        {value === null ? '—' : value}
      </p>
    </div>
  )
}
