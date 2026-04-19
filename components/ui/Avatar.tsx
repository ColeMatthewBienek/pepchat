const AVATAR_PALETTE = [
  '#c94a2a', '#b5623d', '#d89a3a', '#5a7a4a',
  '#6aa08a', '#4a6a85', '#7a4a6b', '#c070a0',
]

export function getAvatarColor(username: string): string {
  let hash = 0
  for (const ch of username) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

const STATUS_COLORS: Record<string, string> = {
  online:  '#6aa08a',
  away:    '#d89a3a',
  dnd:     '#e6543a',
  offline: '#6b6158',
}

interface AvatarUser {
  avatar_url?: string | null
  username: string
  display_name?: string | null
  username_color?: string
}

interface AvatarProps {
  user: AvatarUser
  size?: number
  showStatus?: boolean
  status?: 'online' | 'away' | 'dnd' | 'offline'
  onClick?: () => void
  className?: string
}

export default function Avatar({
  user,
  size = 40,
  showStatus,
  status = 'offline',
  onClick,
  className = '',
}: AvatarProps) {
  const radius = Math.round(size * 0.34)
  const dotSize = Math.max(10, Math.round(size * 0.32))
  const fontSize = Math.max(11, Math.round(size * 0.42))

  const initials = user.display_name
    ? (user.display_name[0] + user.username[0]).toUpperCase()
    : user.username.slice(0, 2).toUpperCase()

  const bgColor = user.username_color || getAvatarColor(user.username)

  const inner = user.avatar_url ? (
    <div
      data-testid="avatar-photo"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: radius,
        backgroundImage: `url(${user.avatar_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.18)',
      }}
    />
  ) : (
    <div
      data-testid="avatar-initials"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: radius,
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 600,
        color: '#fff',
        userSelect: 'none',
        letterSpacing: '0.02em',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.18)',
      }}
    >
      {initials}
    </div>
  )

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
      onClick={onClick}
    >
      {inner}

      {showStatus && (
        <span
          data-testid="avatar-status"
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: STATUS_COLORS[status] ?? STATUS_COLORS.offline,
            border: '2px solid var(--bg-primary)',
            boxShadow: status === 'online' ? '0 0 6px #6aa08a66' : undefined,
          }}
        />
      )}
    </div>
  )
}
