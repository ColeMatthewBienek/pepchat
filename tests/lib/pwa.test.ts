import { describe, it, expect, beforeEach, vi } from 'vitest'

// Each test controls window/navigator state, so we re-import the module fresh each time
// by clearing the module cache between describe blocks.

describe('isInstalled', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
    Object.defineProperty(window.navigator, 'standalone', {
      writable: true,
      configurable: true,
      value: undefined,
    })
  })

  it('returns false when matchMedia standalone is false and navigator.standalone is falsy', async () => {
    const { isInstalled } = await import('@/lib/pwa')
    expect(isInstalled()).toBe(false)
  })

  it('returns true when matchMedia standalone matches', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    const { isInstalled } = await import('@/lib/pwa')
    expect(isInstalled()).toBe(true)
  })

  it('returns true when navigator.standalone is true (iOS Safari)', async () => {
    Object.defineProperty(window.navigator, 'standalone', {
      writable: true,
      configurable: true,
      value: true,
    })
    const { isInstalled } = await import('@/lib/pwa')
    expect(isInstalled()).toBe(true)
  })
})

describe('isIOS', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns true for iPhone user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    })
    const { isIOS } = await import('@/lib/pwa')
    expect(isIOS()).toBe(true)
  })

  it('returns true for iPad user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
    })
    const { isIOS } = await import('@/lib/pwa')
    expect(isIOS()).toBe(true)
  })

  it('returns false for Android user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
    })
    const { isIOS } = await import('@/lib/pwa')
    expect(isIOS()).toBe(false)
  })
})

describe('isAndroid', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns true for Android user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 13; Pixel 7)',
    })
    const { isAndroid } = await import('@/lib/pwa')
    expect(isAndroid()).toBe(true)
  })

  it('returns false for iOS user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    })
    const { isAndroid } = await import('@/lib/pwa')
    expect(isAndroid()).toBe(false)
  })
})

describe('supportsInstallPrompt', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
    Object.defineProperty(window.navigator, 'standalone', {
      writable: true,
      configurable: true,
      value: undefined,
    })
  })

  it('returns true for a non-iOS, non-installed browser', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/114',
    })
    const { supportsInstallPrompt } = await import('@/lib/pwa')
    expect(supportsInstallPrompt()).toBe(true)
  })

  it('returns false on iOS', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    })
    const { supportsInstallPrompt } = await import('@/lib/pwa')
    expect(supportsInstallPrompt()).toBe(false)
  })

  it('returns false when already installed', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/114',
    })
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    const { supportsInstallPrompt } = await import('@/lib/pwa')
    expect(supportsInstallPrompt()).toBe(false)
  })
})
