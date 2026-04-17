'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchTrendingGifs, searchGifs, fetchTrendingSearches, type KlipyGif } from '@/lib/klipy'

// Session-level cache so re-opening the picker doesn't re-fetch
let _cachedTrendingSearches: string[] | null = null

interface GifPickerProps {
  onSelect: (gif: KlipyGif) => void
  onClose: () => void
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<KlipyGif[]>([])
  const [trendingSearches, setTrendingSearches] = useState<string[]>(_cachedTrendingSearches ?? [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  // Refs so IntersectionObserver callback never captures stale closures
  const pageRef = useRef(1)
  const hasNextRef = useRef(true)
  const loadingRef = useRef(false)
  const queryRef = useRef('')

  useEffect(() => { searchInputRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (_cachedTrendingSearches) return
    fetchTrendingSearches()
      .then(results => { _cachedTrendingSearches = results; setTrendingSearches(results) })
      .catch(() => {})
  }, [])

  const loadGifs = useCallback(async (q: string, reset: boolean) => {
    if (loadingRef.current && !reset) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const page = reset ? 1 : pageRef.current
    if (reset) {
      pageRef.current = 1
      hasNextRef.current = true
      setGifs([])
      setError(null)
    }

    loadingRef.current = true
    setLoading(true)

    try {
      const result = q.trim()
        ? await searchGifs(q, page, 24, controller.signal)
        : await fetchTrendingGifs(page, 24, controller.signal)

      if (controller.signal.aborted) return

      pageRef.current = page + 1
      hasNextRef.current = result.hasNext

      setGifs(prev => reset ? result.gifs : [...prev, ...result.gifs])
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError("Couldn't load GIFs. Try again.")
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGifs('', true) }, [loadGifs])

  function handleQueryChange(q: string) {
    setQuery(q)
    queryRef.current = q
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadGifs(q, true), 300)
  }

  function handleChipClick(term: string) {
    setQuery(term)
    queryRef.current = term
    if (debounceRef.current) clearTimeout(debounceRef.current)
    loadGifs(term, true)
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current && hasNextRef.current) {
        loadGifs(queryRef.current, false)
      }
    }, { threshold: 0.1 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadGifs])

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-40 rounded-t-xl md:absolute md:bottom-full md:mb-2 md:left-0 md:right-auto md:rounded-xl md:w-[480px] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
      style={{ height: 360, maxHeight: '60vh', background: 'var(--bg-secondary)' } as React.CSSProperties}
    >
      {/* Search bar */}
      <div className="p-2 border-b border-white/10 flex-shrink-0">
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder="Search KLIPY"
          className="w-full px-3 py-1.5 rounded-lg text-sm bg-white/5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
        />
      </div>

      {/* Trending search chips */}
      {trendingSearches.length > 0 && (
        <div
          className="flex gap-1.5 px-2 py-1.5 overflow-x-auto flex-shrink-0 border-b border-white/5"
          style={{ scrollbarWidth: 'none' }}
        >
          {trendingSearches.map(term => (
            <button
              key={term}
              onClick={() => handleChipClick(term)}
              className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-white/10 hover:border-white/25 hover:bg-white/5 transition-colors"
            >
              #{term}
            </button>
          ))}
        </div>
      )}

      {/* GIF grid */}
      <div className="flex-1 overflow-y-auto p-1.5" style={{ minHeight: 0 }}>
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-sm text-[var(--text-muted)]">{error}</p>
            <button
              onClick={() => loadGifs(query, true)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : loading && gifs.length === 0 ? (
          <div className="columns-2 min-[380px]:columns-3 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-md mb-1"
                style={{
                  background: 'var(--bg-tertiary)',
                  height: [90, 70, 80][i % 3],
                  breakInside: 'avoid',
                  display: 'block',
                }}
              />
            ))}
          </div>
        ) : !loading && gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--text-muted)]">
              {query ? `No GIFs found for "${query}"` : 'No GIFs found'}
            </p>
          </div>
        ) : (
          <>
            <div className="columns-2 min-[380px]:columns-3 gap-1">
              {gifs.map(gif => (
                <GifThumbnail key={gif.id} gif={gif} onSelect={onSelect} />
              ))}
            </div>
            <div ref={sentinelRef} style={{ height: 1 }} />
            {loading && (
              <div className="flex justify-center py-2">
                <svg className="w-4 h-4 text-[var(--text-muted)] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </>
        )}
      </div>

      {/* Attribution — required by Klipy ToS */}
      <div className="flex-shrink-0 py-1 text-center border-t border-white/5">
        <span className="text-[10px] text-[var(--text-muted)]">Powered by Klipy</span>
      </div>
    </div>
  )
}

function GifThumbnail({ gif, onSelect }: { gif: KlipyGif; onSelect: (gif: KlipyGif) => void }) {
  const previewUrl = gif.file.sm?.gif?.url ?? gif.file.md?.gif?.url ?? gif.file.hd?.gif?.url
  return (
    <button
      onClick={() => onSelect(gif)}
      className="w-full mb-1 rounded-md overflow-hidden cursor-pointer transition-transform hover:scale-[1.03] focus:outline-none block text-left"
      style={{ breakInside: 'avoid' }}
    >
      <img
        src={previewUrl}
        alt={gif.title ?? gif.slug}
        loading="lazy"
        className="w-full h-auto block rounded-md"
      />
    </button>
  )
}
