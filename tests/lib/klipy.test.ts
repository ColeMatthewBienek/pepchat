import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { KlipyGif } from '@/lib/klipy'

// Mock process.env before importing klipy so the module-level BASE URL is set
vi.stubEnv('NEXT_PUBLIC_KLIPY_API_KEY', 'test-api-key')

import { fetchTrendingGifs, searchGifs, fetchTrendingSearches, registerShare } from '@/lib/klipy'

const MOCK_GIF: KlipyGif = {
  id: 'gif-1',
  slug: 'funny-cat',
  title: 'Funny Cat',
  file: {
    hd: { gif: { url: 'https://cdn.klipy.com/hd.gif', width: 480, height: 270, size: 1024 } },
    md: { gif: { url: 'https://cdn.klipy.com/md.gif', width: 320, height: 180, size: 512 } },
    sm: { gif: { url: 'https://cdn.klipy.com/sm.gif', width: 240, height: 135, size: 256 } },
    xs: { gif: { url: 'https://cdn.klipy.com/xs.gif', width: 120, height: 68, size: 128 } },
  },
}

function makeOkResponse(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response
}

function makeErrorResponse(status: number, statusText = 'Error') {
  return {
    ok: false,
    status,
    statusText,
    text: vi.fn().mockResolvedValue('something went wrong'),
  } as unknown as Response
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchTrendingGifs', () => {
  it('returns gifs and hasNext on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { data: [MOCK_GIF], has_next: true } })
    )

    const result = await fetchTrendingGifs()

    expect(result.gifs).toHaveLength(1)
    expect(result.gifs[0].id).toBe('gif-1')
    expect(result.hasNext).toBe(true)
  })

  it('returns empty array when API returns 204', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
    } as Response)

    const result = await fetchTrendingGifs()

    expect(result.gifs).toHaveLength(0)
    expect(result.hasNext).toBe(false)
  })

  it('passes page and perPage query params', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { data: [], has_next: false } })
    )

    await fetchTrendingGifs(3, 12)

    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('page=3')
    expect(url).toContain('per_page=12')
  })

  it('defaults to page 1 and perPage 24', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { data: [], has_next: false } })
    )

    await fetchTrendingGifs()

    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('page=1')
    expect(url).toContain('per_page=24')
  })

  it('throws on non-ok HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrorResponse(429, 'Too Many Requests'))

    await expect(fetchTrendingGifs()).rejects.toThrow('Klipy API error: 429')
  })

  it('passes AbortSignal through to fetch', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { data: [], has_next: false } })
    )
    const controller = new AbortController()
    await fetchTrendingGifs(1, 24, controller.signal)

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal })
    )
  })
})

describe('searchGifs', () => {
  it('returns matching gifs', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { data: [MOCK_GIF], has_next: false } })
    )

    const result = await searchGifs('cat')

    expect(result.gifs[0].id).toBe('gif-1')
    expect(result.hasNext).toBe(false)
  })

  it('URL-encodes the search query', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { data: [], has_next: false } })
    )

    await searchGifs('funny cats & dogs')

    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('funny%20cats%20%26%20dogs')
  })

  it('throws on API error', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrorResponse(500))

    await expect(searchGifs('anything')).rejects.toThrow('Klipy API error: 500')
  })
})

describe('fetchTrendingSearches', () => {
  it('returns array of search strings', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { data: ['cats', 'dogs', 'memes'], has_next: false } })
    )

    const result = await fetchTrendingSearches()

    expect(result).toEqual(['cats', 'dogs', 'memes'])
  })

  it('defaults to perPage=10', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { data: [], has_next: false } })
    )

    await fetchTrendingSearches()

    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('per_page=10')
  })
})

describe('registerShare', () => {
  it('fires fetch without throwing (fire-and-forget)', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)

    await expect(registerShare('gif-1', 'user-a')).resolves.toBeUndefined()
  })

  it('does not throw when fetch fails (silent failure by design)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))

    await expect(registerShare('gif-1', 'user-a')).resolves.toBeUndefined()
  })
})
