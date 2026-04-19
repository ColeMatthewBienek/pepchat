const GROUP_TONES = [
  '#c94a2a', '#b5623d', '#d89a3a', '#5a7a4a',
  '#6aa08a', '#4a6a85', '#7a4a6b', '#c070a0',
]

function getGroupTone(id: string): string {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return GROUP_TONES[Math.abs(hash) % GROUP_TONES.length]
}

function getGroupGlyph(name: string): string {
  const cp = name.codePointAt(0) ?? 0
  if (cp > 0x2600) return String.fromCodePoint(cp)
  return name.slice(0, 2).toUpperCase()
}

interface GroupIconProps {
  group: {
    id?: string
    name: string
    icon_url?: string | null
    tone?: string
  }
  size?: number
  active?: boolean
  className?: string
}

export default function GroupIcon({ group, size = 44, active = false, className = '' }: GroupIconProps) {
  const radius = Math.round(size * 0.27)
  const tone = group.tone ?? getGroupTone(group.id ?? group.name)
  const glyph = getGroupGlyph(group.name)
  const isEmoji = (glyph.codePointAt(0) ?? 0) > 0x2600
  const activeRing = active
    ? 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.2), 0 0 0 2px var(--accent)'
    : 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.18)'

  return (
    <div
      data-testid="group-icon-root"
      className={className}
      style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}
    >
      {group.icon_url ? (
        <div
          data-testid="group-icon-photo"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundImage: `url(${group.icon_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: activeRing,
            transition: 'all 180ms ease',
          }}
        />
      ) : (
        <div
          data-testid="group-icon-bubble"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: `linear-gradient(145deg, ${tone}, ${tone}cc)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbf6ee',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: isEmoji ? Math.round(size * 0.45) : Math.round(size * 0.36),
            fontWeight: isEmoji ? 400 : 500,
            letterSpacing: '0.02em',
            boxShadow: activeRing,
            transform: active ? 'scale(1)' : 'scale(0.96)',
            transition: 'all 180ms ease',
          }}
        >
          {glyph}
        </div>
      )}
    </div>
  )
}
