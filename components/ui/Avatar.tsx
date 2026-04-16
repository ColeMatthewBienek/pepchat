interface AvatarProps {
  src?: string | null
  username: string
  size?: number
  online?: boolean
  className?: string
}

/**
 * Round avatar with image or generated initials fallback.
 * Optionally shows a green online-status dot.
 */
export default function Avatar({
  src,
  username,
  size = 40,
  online,
  className = '',
}: AvatarProps) {
  const initials = username.slice(0, 2).toUpperCase()

  // Generate a stable hue from the username string
  const hue =
    username.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={username}
          className="rounded-full w-full h-full object-cover"
        />
      ) : (
        <div
          className="rounded-full w-full h-full flex items-center justify-center text-white font-semibold select-none"
          style={{
            background: `hsl(${hue} 60% 45%)`,
            fontSize: size * 0.38,
          }}
        >
          {initials}
        </div>
      )}

      {online !== undefined && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-[var(--bg-secondary)]"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            background: online ? 'var(--success)' : 'var(--text-muted)',
          }}
        />
      )}
    </div>
  )
}
