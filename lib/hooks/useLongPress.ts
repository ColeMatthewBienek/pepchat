import { useRef, useCallback } from 'react'

interface UseLongPressOptions {
  delay?: number
}

interface LongPressHandlers {
  onPointerDown: (e: PointerEvent | React.PointerEvent) => void
  onPointerUp: () => void
  onPointerMove: () => void
  onPointerLeave: () => void
}

function disableSelection() {
  document.body.style.userSelect = 'none'
  ;(document.body.style as any).webkitUserSelect = 'none'
}

function enableSelection() {
  document.body.style.userSelect = ''
  ;(document.body.style as any).webkitUserSelect = ''
}

export function useLongPress(
  onLongPress: () => void,
  { delay = 500 }: UseLongPressOptions = {}
): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      enableSelection()
    }
  }, [])

  const onPointerDown = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (e.pointerType !== 'touch') return
    disableSelection()
    clear()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      enableSelection()
      onLongPress()
    }, delay)
  }, [onLongPress, delay, clear])

  return {
    onPointerDown,
    onPointerUp: clear,
    onPointerMove: clear,
    onPointerLeave: clear,
  }
}
