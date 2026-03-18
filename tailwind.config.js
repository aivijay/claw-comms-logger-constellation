/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0a0f',
          elevated: '#12121a',
          hover: '#1a1a24',
        },
        'status-green': '#22c55e',
        'status-amber': '#f59e0b',
        'status-red': '#ef4444',
        'status-blue': '#3b82f6',
        'text-primary': '#f8fafc',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        'border-default': '#1e293b',
        'border-hover': '#334155',
      },
    },
  },
  plugins: [],
}