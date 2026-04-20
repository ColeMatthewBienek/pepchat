'use client'

import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Overview',  href: '/admin/overview', tab: 'overview' },
  { label: 'Users',     href: '/admin/users',    tab: 'users'    },
  { label: 'Groups',    href: '/admin/groups',   tab: 'groups'   },
  { label: 'Reports',   href: '/admin/reports',  tab: 'reports'  },
  { label: 'Audit Log', href: '/admin/audit',    tab: 'audit'    },
] as const

interface AdminNavProps {
  activeTab?: string
}

export default function AdminNav({ activeTab: activeProp }: AdminNavProps) {
  const pathname = usePathname()
  const activeTab = activeProp ?? pathname.split('/').pop() ?? 'overview'

  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav className="admin-nav-sidebar" style={{
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
          const isActive = activeTab === item.tab
          return (
            <a key={item.href} href={item.href} data-active={isActive ? 'true' : 'false'}
              style={{
                display: 'flex', alignItems: 'center', padding: '8px 12px',
                borderRadius: 'var(--radius-md)', fontSize: 14,
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

      {/* Mobile: horizontal tab bar */}
      <nav className="admin-nav-tabs" style={{
        display: 'none',
        borderBottom: '1px solid var(--border-soft)',
        background: 'var(--bg-secondary)',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.tab
          return (
            <a key={item.href} href={item.href} data-active={isActive ? 'true' : 'false'}
              style={{
                display: 'inline-flex', alignItems: 'center', padding: '12px 16px',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                textDecoration: 'none', whiteSpace: 'nowrap',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {item.label}
            </a>
          )
        })}
      </nav>
    </>
  )
}
