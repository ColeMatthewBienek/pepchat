const NAV_ITEMS = [
  { label: 'Overview',  href: '/admin/overview' },
  { label: 'Users',     href: '/admin/users'    },
  { label: 'Groups',    href: '/admin/groups'   },
  { label: 'Reports',   href: '/admin/reports'  },
  { label: 'Audit Log', href: '/admin/audit'    },
] as const

interface AdminNavProps {
  activeTab: string
}

export default function AdminNav({ activeTab }: AdminNavProps) {
  return (
    <nav style={{
      width: 220,
      flexShrink: 0,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-soft)',
      padding: '16px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      {NAV_ITEMS.map(item => {
        const tabKey = item.href.split('/').pop()!
        const isActive = activeTab === tabKey
        return (
          <a
            key={item.href}
            href={item.href}
            data-active={isActive ? 'true' : 'false'}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              textDecoration: 'none',
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
              transition: 'background 80ms ease',
            }}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
