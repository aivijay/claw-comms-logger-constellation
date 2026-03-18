import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0a0f",
          elevated: "#12121a",
          hover: "#1a1a24",
        },
        "status-green": "#22c55e",
        "status-amber": "#f59e0b",
        "status-red": "#ef4444",
        "status-blue": "#3b82f6",
        "text-primary": "#f8fafc",
        "text-secondary": "#94a3b8",
        "text-muted": "#64748b",
        "border-default": "#1e293b",
        "border-hover": "#334155",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        "particle-drift": "particle-drift 8s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "particle-drift": {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(100px, -100px)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;