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
    <nav className="admin-nav" aria-label="Admin navigation">
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.tab
        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            data-active={isActive ? 'true' : 'false'}
            className="admin-nav-link"
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
