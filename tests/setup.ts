import '@testing-library/jest-dom'

if (typeof MouseEvent !== 'undefined' && typeof window !== 'undefined') {
  // jsdom does not implement PointerEvent — polyfill it so tests can set
  // pointerType and fireEvent.pointerDown dispatches a real PointerEvent.
  class PointerEvent extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    readonly isPrimary: boolean

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
      this.pointerType = params.pointerType ?? ''
      this.isPrimary = params.isPrimary ?? false
    }
  }

  Object.defineProperty(window, 'PointerEvent', { value: PointerEvent, writable: true })
}
