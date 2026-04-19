'use client'

export const BADGES = [
  { id: '🧪 Researcher',    emoji: '🧪', label: 'Researcher',    adminOnly: false },
  { id: '🔥 OG Member',     emoji: '🔥', label: 'OG Member',     adminOnly: false },
  { id: '💎 Supporter',     emoji: '💎', label: 'Supporter',     adminOnly: false },
  { id: '🎨 Creative',      emoji: '🎨', label: 'Creative',      adminOnly: false },
  { id: '🛠️ Builder',       emoji: '🛠️', label: 'Builder',       adminOnly: false },
  { id: '🌍 Globetrotter',  emoji: '🌍', label: 'Globetrotter',  adminOnly: false },
  { id: '🎮 Gamer',         emoji: '🎮', label: 'Gamer',         adminOnly: false },
  { id: '📚 Bookworm',      emoji: '📚', label: 'Bookworm',      adminOnly: false },
  { id: '🏋️ Lifter',        emoji: '🏋️', label: 'Lifter',        adminOnly: false },
  { id: '🤖 Tech Nerd',     emoji: '🤖', label: 'Tech Nerd',     adminOnly: false },
  { id: '👑 Legend',        emoji: '👑', label: 'Legend',        adminOnly: true  },
  { id: '⚡ Early Adopter', emoji: '⚡', label: 'Early Adopter', adminOnly: true  },
]

interface BadgeSelectorProps {
  value: string | null
  onChange: (badge: string | null) => void
  isAdmin?: boolean
}

export default function BadgeSelector({ value, onChange, isAdmin = false }: BadgeSelectorProps) {
  const available = BADGES.filter(b => !b.adminOnly || isAdmin)

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Badge</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
        {/* None option */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-2 py-1.5 min-h-[44px] rounded-lg text-xs border transition-colors text-left ${
            value === null
              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
              : 'border-white/10 text-[var(--text-muted)] hover:border-white/25 hover:bg-white/5'
          }`}
        >
          None
        </button>
        {available.map(badge => (
          <button
            key={badge.id}
            type="button"
            onClick={() => onChange(badge.id)}
            className={`px-2 py-1.5 min-h-[44px] rounded-lg text-xs border transition-colors text-left ${
              value === badge.id
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                : 'border-white/10 text-[var(--text-muted)] hover:border-white/25 hover:bg-white/5'
            }`}
            title={badge.label}
          >
            {badge.emoji} {badge.label}
          </button>
        ))}
      </div>
    </div>
  )
}
