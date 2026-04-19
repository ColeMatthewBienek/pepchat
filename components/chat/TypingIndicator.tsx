'use client'

interface TypingIndicatorProps {
  typingUsernames: string[]
}

export default function TypingIndicator({ typingUsernames }: TypingIndicatorProps) {
  if (typingUsernames.length === 0) return <div style={{ height: 24, flexShrink: 0 }} />

  let text: string
  if (typingUsernames.length === 1) {
    text = `${typingUsernames[0]} is typing…`
  } else if (typingUsernames.length === 2) {
    text = `${typingUsernames[0]} and ${typingUsernames[1]} are typing…`
  } else {
    text = 'Several people are typing…'
  }

  return (
    <div
      style={{
        height: 24,
        flexShrink: 0,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            data-testid="typing-dot"
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--typing)',
              animation: `typing-bounce 600ms ease-in-out ${i * 150}ms infinite`,
            }}
          />
        ))}
      </span>
      <span
        data-testid="typing-text"
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}
      >
        {text}
      </span>
    </div>
  )
}
