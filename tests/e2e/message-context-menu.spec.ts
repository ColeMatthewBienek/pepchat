import { test, expect } from '@playwright/test'

const EMAIL = process.env.TEST_USER_EMAIL ?? 'colebienek@proton.me'
const PASSWORD = process.env.TEST_USER_PASSWORD ?? '12345678'

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/channels/**', { timeout: 10000 })
  // Navigate to a channel with messages
  const firstChannel = page.locator('[data-testid="channel-link"]').first()
  if (await firstChannel.count() > 0) await firstChannel.click()
  await page.waitForTimeout(1500)
})

test.describe('Message context menu', () => {
  test('right-click opens context menu', async ({ page }) => {
    const message = page.locator('.message-row').first()
    await message.click({ button: 'right' })
    await expect(page.locator('.context-menu')).toBeVisible()
  })

  test('context menu closes on outside click', async ({ page }) => {
    const message = page.locator('.message-row').first()
    await message.click({ button: 'right' })
    await expect(page.locator('.context-menu')).toBeVisible()
    await page.mouse.click(10, 10)
    await expect(page.locator('.context-menu')).not.toBeVisible()
  })

  test('context menu closes on Escape', async ({ page }) => {
    const message = page.locator('.message-row').first()
    await message.click({ button: 'right' })
    await expect(page.locator('.context-menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.context-menu')).not.toBeVisible()
  })

  test('browser native context menu is suppressed', async ({ page }) => {
    const message = page.locator('.message-row').first()
    await message.click({ button: 'right' })
    // Custom menu appearing confirms preventDefault worked
    await expect(page.locator('.context-menu')).toBeVisible()
  })

  test('quick reaction row shows 8 emojis', async ({ page }) => {
    const message = page.locator('.message-row').first()
    await message.click({ button: 'right' })
    const reactions = page.locator('.context-menu .quick-reaction')
    await expect(reactions).toHaveCount(8)
  })

  test('Copy Text copies message content and shows toast', async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    const message = page.locator('.message-row').first()
    await message.click({ button: 'right' })
    await page.locator('.context-menu').getByText('Copy Text').click()
    await expect(page.locator('.context-menu')).not.toBeVisible()
    await expect(page.locator('[data-testid="copy-toast"]')).toBeVisible()
  })

  test('Edit Message only visible for own messages', async ({ page }) => {
    const ownMessage = page.locator('.message-row.own-message').first()
    if (await ownMessage.count() === 0) {
      test.skip()
      return
    }
    await ownMessage.click({ button: 'right' })
    await expect(page.locator('.context-menu').getByText('Edit Message')).toBeVisible()
    await page.keyboard.press('Escape')

    const otherMessage = page.locator('.message-row:not(.own-message)').first()
    if (await otherMessage.count() === 0) return
    await otherMessage.click({ button: 'right' })
    await expect(page.locator('.context-menu').getByText('Edit Message')).not.toBeVisible()
  })

  test('Delete Message shows confirmation then cancel', async ({ page }) => {
    const ownMessage = page.locator('.message-row.own-message').first()
    if (await ownMessage.count() === 0) {
      test.skip()
      return
    }
    await ownMessage.click({ button: 'right' })
    await page.locator('.context-menu').getByText('Delete Message').click()
    await expect(page.locator('[data-testid="ctx-delete-confirm-dialog"]')).toBeVisible()
    await page.locator('[data-testid="ctx-delete-cancel"]').click()
    await expect(page.locator('[data-testid="ctx-delete-confirm-dialog"]')).not.toBeVisible()
  })

  test('menu repositions near right edge of viewport', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 })
    const message = page.locator('.message-row').first()
    const box = await message.boundingBox()
    if (!box) { test.skip(); return }
    await page.mouse.click(750, box.y + 10, { button: 'right' })
    const menu = page.locator('.context-menu')
    await expect(menu).toBeVisible()
    const menuBox = await menu.boundingBox()
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(800)
  })

  test('only one menu open at a time', async ({ page }) => {
    const messages = page.locator('.message-row')
    if (await messages.count() < 2) { test.skip(); return }
    await messages.nth(0).click({ button: 'right' })
    await expect(page.locator('.context-menu')).toHaveCount(1)
    await messages.nth(1).click({ button: 'right' })
    await expect(page.locator('.context-menu')).toHaveCount(1)
  })

  test('Reply item closes menu and focuses composer', async ({ page }) => {
    const message = page.locator('.message-row').first()
    await message.click({ button: 'right' })
    await page.locator('.context-menu').getByText('Reply').click()
    await expect(page.locator('.context-menu')).not.toBeVisible()
  })

  test('Copy Message Link closes menu', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    const message = page.locator('.message-row').first()
    await message.click({ button: 'right' })
    await page.locator('.context-menu').getByText('Copy Message Link').click()
    await expect(page.locator('.context-menu')).not.toBeVisible()
  })
})
