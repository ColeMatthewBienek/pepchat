'use client'

import { useEffect, useRef } from 'react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

interface EmojiPickerPopoverProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export default function EmojiPickerPopover({ onSelect, onClose }: EmojiPickerPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div ref={containerRef} className="absolute z-50 bottom-8 right-0">
      <Picker
        data={data}
        onEmojiSelect={(emoji: { native: string }) => {
          onSelect(emoji.native)
          onClose()
        }}
        theme="dark"
        set="native"
        previewPosition="none"
        skinTonePosition="none"
        maxFrequentRows={2}
      />
    </div>
  )
}
