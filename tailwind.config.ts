import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f1117',
        surface: '#1a1f2e',
        'surface-hover': '#242b3d',
        'surface-active': '#2d3548',
        border: '#2d3548',
        'border-subtle': '#1f2637',
        accent: 'var(--accent-color, #3b82f6)',
        'accent-hover': 'var(--accent-hover, #2563eb)',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        'status-green': '#22c55e',
        'status-amber': '#f59e0b',
        'status-red': '#ef4444',
        'status-blue': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;