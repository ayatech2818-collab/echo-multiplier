/** @type {import('tailwindcss').Config} */
// Colors are CSS variables (space-separated RGB channels, see app/globals.css) so every utility,
// including opacity modifiers like `bg-accent/10`, works in both light and dark mode.
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Page + surfaces
        page: c('page'),
        surface: c('surface'),
        line: c('line'),
        'line-strong': c('line-strong'),
        // Text
        ink: c('ink'),
        muted: c('muted'),
        faint: c('faint'),
        // Accent
        accent: {
          DEFAULT: c('accent'),
          hover: c('accent-hover'),
          soft: c('accent-soft'),
        },
        success: {
          DEFAULT: c('success'),
          hover: c('success-hover'),
          soft: c('success-soft'),
        },
        danger: {
          DEFAULT: c('danger'),
          soft: c('danger-soft'),
        },
        warn: {
          DEFAULT: c('warn'),
          soft: c('warn-soft'),
        },
        violet: {
          DEFAULT: c('violet'),
          hover: c('violet-hover'),
          soft: c('violet-soft'),
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
        pop: '0 4px 16px rgba(15, 23, 42, 0.10), 0 1px 3px rgba(15, 23, 42, 0.06)',
      },
      minHeight: {
        screen: '100dvh',
      },
    },
  },
  plugins: [],
}
