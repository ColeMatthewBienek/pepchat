'use client'

import dynamic from 'next/dynamic'

const EmojiPickerPopover = dynamic(
  () => import('./EmojiPickerPopover'),
  { ssr: false }
)

export default EmojiPickerPopover
