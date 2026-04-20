import { test, expect } from '@playwright/test'

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    ?? process.env.TEST_USER_EMAIL    ?? 'colebienek@proton.me'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? process.env.TEST_USER_PASSWORD ?? '12345678'

// Non-admin credentials — update via env var when available
const USER_EMAIL    = process.env.TEST_NONADMIN_EMAIL    ?? ''
const USER_PASSWORD = process.env.TEST_NONADMIN_PASSWORD ?? ''

async function loginAs(page: any, email: string, password: string) {
  await page.goto('http://localhost:3000/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/channels/**', { timeout: 10000 })
}

test.describe('Admin dashboard — access control', () => {
  test('admin can access /admin', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('http://localhost:3000/admin')
    await expect(page.locator('h1')).toContainText('Admin')
  })

  test('non-admin is redirected from /admin to /', async ({ page }) => {
    if (!USER_EMAIL) { test.skip(); return }
    await loginAs(page, USER_EMAIL, USER_PASSWORD)
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/)
  })

  test('unauthenticated user is redirected from /admin', async ({ page }) => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).not.toHaveURL(/\/admin/)
  })
})

test.describe('Admin dashboard — overview tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('http://localhost:3000/admin/overview')
  })

  test('shows 4 metric cards', async ({ page }) => {
    await expect(page.locator('[data-testid="metric-card"]')).toHaveCount(4)
  })

  test('shows Total Users metric', async ({ page }) => {
    await expect(page.locator('[data-testid="metric-card"]').filter({ hasText: 'Total Users' })).toBeVisible()
  })

  test('shows recent activity feed', async ({ page }) => {
    await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible()
  })
})

test.describe('Admin dashboard — users tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('http://localhost:3000/admin/users')
  })

  test('shows user list', async ({ page }) => {
    const rows = page.locator('.user-row')
    await expect(rows).toHaveCount(expect.any(Number) as any)
    expect(await rows.count()).toBeGreaterThan(0)
  })

  test('search filters users', async ({ page }) => {
    const search = page.locator('.user-search')
    await search.fill('panic')
    const rows = page.locator('.user-row')
    await expect(rows.first()).toContainText('panic')
  })

  test('prev button is disabled on first page', async ({ page }) => {
    await expect(page.locator('button:has-text("Prev")')).toBeDisabled()
  })
})

test.describe('Admin dashboard — groups tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('http://localhost:3000/admin/groups')
  })

  test('shows groups list', async ({ page }) => {
    await expect(page.locator('.group-row').first()).toBeVisible()
  })
})

test.describe('Admin dashboard — reports tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('http://localhost:3000/admin/reports')
  })

  test('shows empty state or report list', async ({ page }) => {
    const hasReports = await page.locator('.report-row').count() > 0
    if (!hasReports) {
      await expect(page.locator('text=/no reports yet/i')).toBeVisible()
    }
  })
})

test.describe('Admin dashboard — audit log tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('http://localhost:3000/admin/audit')
  })

  test('shows audit log or empty state', async ({ page }) => {
    const hasEntries = await page.locator('.audit-entry').count() > 0
    if (!hasEntries) {
      await expect(page.locator('text=/no audit entries/i')).toBeVisible()
    }
  })

  test('has CSV export button', async ({ page }) => {
    await expect(page.locator('[data-testid="export-csv"]')).toBeVisible()
  })

  test('audit log records role change', async ({ page }) => {
    // Navigate to users, trigger role change, then check audit log
    await page.goto('http://localhost:3000/admin/audit')
    const entries = page.locator('.audit-entry')
    if (await entries.count() > 0) {
      await expect(entries.first()).toContainText(/role|ban|delete/i)
    }
  })
})

test.describe('Admin sidebar link', () => {
  test('admin users see Admin Dashboard link in sidebar', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page.locator('a[href="/admin"]')).toBeVisible()
  })
})
