import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuditLogList from '@/components/admin/AuditLogList'
import type { AuditEntry } from '@/lib/types'

const ENTRIES: AuditEntry[] = [
  {
    id: 'a1',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'role_change',
    target_type: 'user',
    target_id: 'u2',
    metadata: { from_role: 'user', to_role: 'moderator', target_username: 'cool42' },
    created_at: '2026-04-19T10:32:00Z',
  },
  {
    id: 'a2',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'ban',
    target_type: 'user',
    target_id: 'u4',
    metadata: { reason: 'spam', target_username: 'banned_user' },
    created_at: '2026-04-19T09:00:00Z',
  },
  {
    id: 'a3',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'delete_message',
    target_type: 'message',
    target_id: 'msg-1',
    metadata: { channel_id: 'ch-1', message_preview: 'bad content' },
    created_at: '2026-04-18T15:00:00Z',
  },
  {
    id: 'a4',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'report_reviewed',
    target_type: 'report',
    target_id: 'r1',
    metadata: {
      report_id: 'r1',
      reporter_username: 'cool42',
      message_preview: 'reported message text',
    },
    created_at: '2026-04-18T14:00:00Z',
  },
  {
    id: 'a5',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'report_dismissed',
    target_type: 'report',
    target_id: 'r2',
    metadata: {
      report_id: 'r2',
      reporter_username: 'newbie',
      reason: 'not actionable',
    },
    created_at: '2026-04-18T13:00:00Z',
  },
  {
    id: 'a6',
    admin_id: 'u1',
    admin_username: 'panicmonkey',
    admin_avatar_url: null,
    action: 'reset_password',
    target_type: 'user',
    target_id: 'u6',
    metadata: { target_username: 'locked_user' },
    created_at: '2026-04-18T12:00:00Z',
  },
]

const defaultProps = {
  entries: ENTRIES,
}

function mockCsvDownload() {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  const OriginalBlob = globalThis.Blob
  const createObjectURL = vi.fn<(object: Blob | MediaSource) => string>(() => 'blob:audit-csv')
  const revokeObjectURL = vi.fn()
  const click = vi.fn()
  let blobParts: BlobPart[] = []
  let anchor: HTMLAnchorElement | null = null
  const originalCreateElement = document.createElement.bind(document)

  class TestBlob extends OriginalBlob {
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      blobParts = parts ?? []
      super(parts, options)
    }
  }

  Object.defineProperty(globalThis, 'Blob', { configurable: true, value: TestBlob })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })

  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((
    (tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options)
      if (tagName.toLowerCase() === 'a') {
        anchor = element as HTMLAnchorElement
        Object.defineProperty(element, 'click', { configurable: true, value: click })
      }
      return element
    }
  ) as typeof document.createElement)

  return {
    createObjectURL,
    revokeObjectURL,
    click,
    get csv() {
      return blobParts.join('')
    },
    get anchor() {
      return anchor
    },
    restore() {
      createElementSpy.mockRestore()
      Object.defineProperty(globalThis, 'Blob', { configurable: true, value: OriginalBlob })
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL })
      } else {
        Reflect.deleteProperty(URL, 'createObjectURL')
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL })
      } else {
        Reflect.deleteProperty(URL, 'revokeObjectURL')
      }
    },
  }
}

describe('AuditLogList — rendering', () => {
  it('renders an .audit-entry for each log entry', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(ENTRIES.length)
  })

  it('shows admin username in each entry', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getAllByText(/panicmonkey/i).length).toBeGreaterThan(0)
  })

  it('shows human-readable role change description', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/role.*user.*moderator|user.*→.*moderator/i)).toBeTruthy()
  })

  it('shows human-readable ban description', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/banned.*banned_user|banned_user.*banned/i)).toBeTruthy()
  })

  it('shows human-readable report reviewed description', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/reviewed report r1 from @cool42: "reported message text"/i)).toBeTruthy()
  })

  it('shows human-readable report dismissed description', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/dismissed report r2 from @newbie \(not actionable\)/i)).toBeTruthy()
  })

  it('shows human-readable password reset description', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/sent a password reset email to locked_user/i)).toBeTruthy()
  })

  it('renders entries in reverse chronological order', () => {
    render(<AuditLogList {...defaultProps} />)
    const entries = document.querySelectorAll('.audit-entry')
    // First entry should be the most recent (a1)
    expect(entries[0].textContent).toContain('cool42')
  })

  it('shows empty state when no entries', () => {
    render(<AuditLogList entries={[]} />)
    expect(screen.getByText(/no audit entries/i)).toBeTruthy()
  })
})

describe('AuditLogList — filtering', () => {
  it('has a filter by action type select', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(document.querySelector('[data-testid="audit-filter-action"]')).toBeTruthy()
  })

  it('has a search input for audit entries', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByTestId('audit-search')).toBeInTheDocument()
  })

  it('has date range filters for audit entries', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByTestId('audit-start-date')).toBeInTheDocument()
    expect(screen.getByTestId('audit-end-date')).toBeInTheDocument()
  })

  it('filters entries by action type', () => {
    render(<AuditLogList {...defaultProps} />)
    const filter = document.querySelector('[data-testid="audit-filter-action"]') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'ban' } })
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(1)
  })

  it('filters entries by report review action type', () => {
    render(<AuditLogList {...defaultProps} />)
    const filter = document.querySelector('[data-testid="audit-filter-action"]') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'report_reviewed' } })
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(1)
    expect(screen.getByText(/reviewed report r1/i)).toBeTruthy()
  })

  it('filters entries by password reset action type', () => {
    render(<AuditLogList {...defaultProps} />)
    const filter = document.querySelector('[data-testid="audit-filter-action"]') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'reset_password' } })
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(1)
    expect(screen.getByText(/password reset email to locked_user/i)).toBeTruthy()
  })

  it('shows all entries when filter reset to "all"', () => {
    render(<AuditLogList {...defaultProps} />)
    const filter = document.querySelector('[data-testid="audit-filter-action"]') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'ban' } })
    fireEvent.change(filter, { target: { value: 'all' } })
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(ENTRIES.length)
  })

  it('searches entries by admin username and description', () => {
    render(<AuditLogList {...defaultProps} />)
    const search = screen.getByTestId('audit-search')

    fireEvent.change(search, { target: { value: 'locked_user' } })

    expect(document.querySelectorAll('.audit-entry')).toHaveLength(1)
    expect(screen.getByText(/password reset email to locked_user/i)).toBeTruthy()
  })

  it('searches entries by metadata content', () => {
    render(<AuditLogList {...defaultProps} />)
    const search = screen.getByTestId('audit-search')

    fireEvent.change(search, { target: { value: 'bad content' } })

    expect(document.querySelectorAll('.audit-entry')).toHaveLength(1)
    expect(screen.getByText(/deleted a message in channel ch-1/i)).toBeTruthy()
  })

  it('combines action filtering with search', () => {
    render(<AuditLogList {...defaultProps} />)
    const filter = document.querySelector('[data-testid="audit-filter-action"]') as HTMLSelectElement
    const search = screen.getByTestId('audit-search')

    fireEvent.change(filter, { target: { value: 'report_reviewed' } })
    fireEvent.change(search, { target: { value: 'cool42' } })

    expect(document.querySelectorAll('.audit-entry')).toHaveLength(1)
    expect(screen.getByText(/reviewed report r1/i)).toBeTruthy()

    fireEvent.change(search, { target: { value: 'locked_user' } })
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(0)
    expect(screen.getByText(/no audit entries/i)).toBeTruthy()
  })

  it('filters entries by start date', () => {
    render(<AuditLogList {...defaultProps} />)

    fireEvent.change(screen.getByTestId('audit-start-date'), { target: { value: '2026-04-19' } })

    expect(document.querySelectorAll('.audit-entry')).toHaveLength(2)
    expect(screen.getByText(/changed cool42's role/i)).toBeTruthy()
    expect(screen.getByText(/banned.*banned_user/i)).toBeTruthy()
    expect(screen.queryByText(/deleted a message/i)).toBeNull()
  })

  it('filters entries by end date inclusively', () => {
    render(<AuditLogList {...defaultProps} />)

    fireEvent.change(screen.getByTestId('audit-end-date'), { target: { value: '2026-04-18' } })

    expect(document.querySelectorAll('.audit-entry')).toHaveLength(4)
    expect(screen.queryByText(/changed cool42's role/i)).toBeNull()
    expect(screen.getByText(/password reset email to locked_user/i)).toBeTruthy()
  })

  it('combines date range, action, and search filters', () => {
    render(<AuditLogList {...defaultProps} />)
    const filter = document.querySelector('[data-testid="audit-filter-action"]') as HTMLSelectElement

    fireEvent.change(screen.getByTestId('audit-start-date'), { target: { value: '2026-04-18' } })
    fireEvent.change(screen.getByTestId('audit-end-date'), { target: { value: '2026-04-18' } })
    fireEvent.change(filter, { target: { value: 'report_dismissed' } })
    fireEvent.change(screen.getByTestId('audit-search'), { target: { value: 'newbie' } })

    expect(document.querySelectorAll('.audit-entry')).toHaveLength(1)
    expect(screen.getByText(/dismissed report r2 from @newbie/i)).toBeTruthy()

    fireEvent.change(screen.getByTestId('audit-search'), { target: { value: 'cool42' } })
    expect(document.querySelectorAll('.audit-entry')).toHaveLength(0)
  })
})

describe('AuditLogList — CSV export', () => {
  it('renders a CSV export button', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(screen.getByText(/export.*csv|csv.*export/i)).toBeTruthy()
  })

  it('CSV export button has data-testid="export-csv"', () => {
    render(<AuditLogList {...defaultProps} />)
    expect(document.querySelector('[data-testid="export-csv"]')).toBeTruthy()
  })

  it('exports only the currently filtered audit entries', () => {
    const download = mockCsvDownload()

    try {
      render(<AuditLogList {...defaultProps} />)

      fireEvent.change(screen.getByTestId('audit-search'), { target: { value: 'locked_user' } })
      fireEvent.click(screen.getByTestId('export-csv'))

      expect(download.createObjectURL).toHaveBeenCalledTimes(1)
      const csv = download.csv

      expect(csv.split('\n')).toHaveLength(2)
      expect(csv).toContain('"a6","panicmonkey","reset_password","user","u6"')
      expect(csv).toContain('""target_username"":""locked_user""')
      expect(csv).not.toContain('"a1","panicmonkey","role_change"')
      expect(csv).not.toContain('"a4","panicmonkey","report_reviewed"')
      expect(download.anchor?.href).toBe('blob:audit-csv')
      expect(download.anchor?.download).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/)
      expect(download.click).toHaveBeenCalledTimes(1)
      expect(download.revokeObjectURL).toHaveBeenCalledWith('blob:audit-csv')
    } finally {
      download.restore()
    }
  })
})
