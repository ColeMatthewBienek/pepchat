'use client'

interface TypingIndicatorProps {
  typingUsernames: string[]
}

/** Shows "[user] is typing…" below the message list. */
export default function TypingIndicator({ typingUsernames }: TypingIndicatorProps) {
  if (typingUsernames.length === 0) return <div className="h-5 flex-shrink-0" />

  let text: string
  if (typingUsernames.length === 1) {
    text = `${typingUsernames[0]} is typing…`
  } else if (typingUsernames.length === 2) {
    text = `${typingUsernames[0]} and ${typingUsernames[1]} are typing…`
  } else {
    text = 'Several people are typing…'
  }

  return (
    <div className="h-5 flex-shrink-0 flex items-center px-4">
      <span className="text-xs text-[var(--text-muted)] animate-pulse">{text}</span>
    </div>
  )
}
