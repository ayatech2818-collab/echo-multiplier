/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Page + surfaces
        page: '#f8fafc', // slate-50
        surface: '#ffffff',
        line: '#e2e8f0', // slate-200
        'line-strong': '#cbd5e1', // slate-300
        // Text
        ink: '#0f172a', // slate-900
        muted: '#475569', // slate-600 (>=4.5:1 on white)
        faint: '#94a3b8', // slate-400 (non-essential only)
        // Accent
        accent: {
          DEFAULT: '#2563eb', // blue-600
          hover: '#1d4ed8', // blue-700
          soft: '#eff6ff', // blue-50
        },
        success: {
          DEFAULT: '#059669', // emerald-600
          hover: '#047857', // emerald-700
          soft: '#ecfdf5', // emerald-50
        },
        danger: {
          DEFAULT: '#dc2626', // red-600
          soft: '#fef2f2', // red-50
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
        pop: '0 4px 16px rgba(15, 23, 42, 0.10), 0 1px 3px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}
