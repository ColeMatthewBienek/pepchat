import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLongPress } from '@/lib/hooks/useLongPress'

describe('useLongPress', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('fires callback after default 500ms hold', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))

    act(() => { result.current.onPointerDown({ pointerType: 'touch' } as PointerEvent) })
    expect(onLongPress).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(500) })
    expect(onLongPress).toHaveBeenCalledOnce()
  })

  it('fires callback after custom delay', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress, { delay: 700 }))

    act(() => { result.current.onPointerDown({ pointerType: 'touch' } as PointerEvent) })
    act(() => { vi.advanceTimersByTime(499) })
    expect(onLongPress).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(201) })
    expect(onLongPress).toHaveBeenCalledOnce()
  })

  it('does not fire when pointerUp before timer expires', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))

    act(() => { result.current.onPointerDown({ pointerType: 'touch' } as PointerEvent) })
    act(() => { vi.advanceTimersByTime(400) })
    act(() => { result.current.onPointerUp() })
    act(() => { vi.advanceTimersByTime(200) })

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not fire when pointerMove before timer expires (scroll cancel)', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))

    act(() => { result.current.onPointerDown({ pointerType: 'touch' } as PointerEvent) })
    act(() => { vi.advanceTimersByTime(300) })
    act(() => { result.current.onPointerMove() })
    act(() => { vi.advanceTimersByTime(400) })

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not fire when pointerLeave before timer expires', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))

    act(() => { result.current.onPointerDown({ pointerType: 'touch' } as PointerEvent) })
    act(() => { vi.advanceTimersByTime(200) })
    act(() => { result.current.onPointerLeave() })
    act(() => { vi.advanceTimersByTime(500) })

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not fire for mouse pointerDown (touch only)', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))

    act(() => { result.current.onPointerDown({ pointerType: 'mouse' } as PointerEvent) })
    act(() => { vi.advanceTimersByTime(600) })

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('fires only once per hold — not repeatedly', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))

    act(() => { result.current.onPointerDown({ pointerType: 'touch' } as PointerEvent) })
    act(() => { vi.advanceTimersByTime(1000) })

    expect(onLongPress).toHaveBeenCalledOnce()
  })

  it('can fire again after a second hold', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))

    act(() => { result.current.onPointerDown({ pointerType: 'touch' } as PointerEvent) })
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { result.current.onPointerUp() })

    act(() => { result.current.onPointerDown({ pointerType: 'touch' } as PointerEvent) })
    act(() => { vi.advanceTimersByTime(500) })

    expect(onLongPress).toHaveBeenCalledTimes(2)
  })
})
