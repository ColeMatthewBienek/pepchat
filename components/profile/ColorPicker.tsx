'use client'

import { useState } from 'react'

const PRESETS = [
  '#ffffff', '#ff6b6b', '#ff922b', '#ffd43b',
  '#69db7c', '#38d9a9', '#4dabf7', '#748ffc',
  '#f783ac', '#ffa8a8', '#ffc078', '#ffe066',
  '#b2f2bb', '#96f2d7', '#a5d8ff', '#bac8ff',
  '#f9a8d4', '#e9d5ff',
]

const DARK_BG = 0x31 / 255 // luminance threshold (~0.19) for dark background detection

function hexToRgb(hex: string | undefined | null): [number, number, number] | null {
  if (!hex) return null
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m || m.length < 3) return null
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)]
}

function relativeLuminance(r: number, g: number, b: number) {
  const srgb = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function contrastRatio(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const fg = relativeLuminance(...rgb)
  const bg = DARK_BG
  const [light, dark] = fg > bg ? [fg, bg] : [bg, fg]
  return (light + 0.05) / (dark + 0.05)
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label: string
  previewText?: string
}

export default function ColorPicker({ value, onChange, label, previewText }: ColorPickerProps) {
  const safeValue = value || '#ffffff'
  const [hex, setHex] = useState(safeValue)
  const lowContrast = contrastRatio(safeValue) < 3

  function handleHexInput(raw: string) {
    setHex(raw)
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) onChange(raw)
  }

  function handlePresetClick(color: string) {
    setHex(color)
    onChange(color)
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</label>

      {/* Preset swatches */}
      <div className="grid grid-cols-9 gap-1">
        {PRESETS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => handlePresetClick(color)}
            className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 focus:outline-none"
            style={{
              background: color,
              borderColor: safeValue === color ? 'var(--accent)' : 'transparent',
            }}
            title={color}
          />
        ))}
      </div>

      {/* Hex input */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md border border-white/20 flex-shrink-0" style={{ background: safeValue }} />
        <input
          type="text"
          value={hex}
          onChange={e => handleHexInput(e.target.value)}
          placeholder="#ffffff"
          maxLength={7}
          className="w-28 px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 font-mono"
        />
        {previewText && (
          <span className="text-sm font-semibold" style={{ color: safeValue }}>{previewText}</span>
        )}
      </div>

      {lowContrast && (
        <p className="text-[10px] text-yellow-400/80">This color may be hard to read on dark backgrounds.</p>
      )}
    </div>
  )
}
