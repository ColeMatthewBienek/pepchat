const API_KEY = process.env.NEXT_PUBLIC_KLIPY_API_KEY
const BASE = `https://api.klipy.com/api/v1/${API_KEY}`

if (!API_KEY && typeof window !== 'undefined') {
  console.warn('[klipy] NEXT_PUBLIC_KLIPY_API_KEY is not set')
}

export interface KlipyGifSize {
  gif: { url: string; width: number; height: number; size: number }
  webp?: { url: string }
  jpg?: { url: string }
  mp4?: { url: string }
}

export interface KlipyGif {
  id: string
  slug: string
  title?: string
  file: {
    hd: KlipyGifSize
    md: KlipyGifSize
    sm: KlipyGifSize
    xs: KlipyGifSize
  }
  tags?: string[]
  blur_preview?: string
}

interface KlipyPage {
  data: KlipyGif[]
  has_next: boolean
}

async function klipyFetch(url: string, signal?: AbortSignal): Promise<KlipyPage> {
  const res = await fetch(url, signal ? { signal } : undefined)
  if (res.status === 204) return { data: [], has_next: false }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[klipy] ${res.status} ${res.statusText}\n${body}`)
    throw new Error(`Klipy API error: ${res.status}`)
  }
  const json = await res.json()
  return { data: json.data?.data ?? [], has_next: json.data?.has_next ?? false }
}

export async function fetchTrendingGifs(
  page = 1,
  perPage = 24,
  signal?: AbortSignal
): Promise<{ gifs: KlipyGif[]; hasNext: boolean }> {
  const { data, has_next } = await klipyFetch(
    `${BASE}/gifs/trending?page=${page}&per_page=${perPage}`,
    signal
  )
  return { gifs: data, hasNext: has_next }
}

export async function searchGifs(
  query: string,
  page = 1,
  perPage = 24,
  signal?: AbortSignal
): Promise<{ gifs: KlipyGif[]; hasNext: boolean }> {
  const { data, has_next } = await klipyFetch(
    `${BASE}/gifs/search?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
    signal
  )
  return { gifs: data, hasNext: has_next }
}

export async function registerShare(gifId: string, userId: string): Promise<void> {
  // Required by Klipy ToS — fire-and-forget
  fetch(`${BASE}/gifs/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: gifId, customer_id: userId }),
  }).catch(() => {})
}

export async function fetchTrendingSearches(perPage = 10): Promise<string[]> {
  const { data } = await klipyFetch(
    `${BASE}/gifs/trending/searches?per_page=${perPage}`
  )
  return (data as unknown as string[]) ?? []
}
