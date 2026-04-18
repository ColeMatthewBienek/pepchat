import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'bg-deepest':   '#14110e',
        'bg-primary':   '#1a1613',
        'bg-secondary': '#221d18',
        'bg-tertiary':  '#2b2520',
        'bg-elevated':  '#2f2822',
        'accent':       '#e6543a',
        'accent-hover': '#ff6b4a',
        'text-primary': '#f4ebdd',
        'text-muted':   '#b8a896',
        'text-faint':   '#8a7b6c',
        'text-link':    '#e8a273',
        'online':       '#6aa08a',
        'typing':       '#d89a3a',
        // Keep legacy tokens for any components using var()-based Tailwind classes
        danger:  'var(--danger)',
        success: 'var(--success)',
      },
      borderRadius: {
        'sm':  '6px',
        'md':  '8px',
        'lg':  '12px',
        'xl':  '14px',
        '2xl': '16px',
      },
      spacing: {
        '13': '52px',
        '14': '56px',
      },
    },
  },
  plugins: [],
}

export default config
