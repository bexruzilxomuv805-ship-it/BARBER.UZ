/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Driven by CSS variables (src/index.css) so the whole ink scale flips
        // between dark and light theme without touching any component classes.
        ink: {
          50: 'rgb(var(--ink-50) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          950: 'rgb(var(--ink-950) / <alpha-value>)',
        },
        strong: 'rgb(var(--strong) / <alpha-value>)',
        'on-gold': 'rgb(10 10 10 / <alpha-value>)',
        gold: {
          50: '#fbf7e9',
          100: '#f5ecc6',
          200: '#ecd88f',
          300: '#e2c158',
          400: '#d9ad3a',
          500: '#c9a227',
          600: '#a9821e',
          700: '#856419',
          800: '#6b511b',
          900: '#5a441c',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'barber-radial': 'radial-gradient(circle at 50% 0%, rgba(201,162,39,0.15), transparent 60%)',
        'gold-line': 'linear-gradient(90deg, transparent, #c9a227, transparent)',
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(201,162,39,0.4), 0 8px 30px -10px rgba(201,162,39,0.35)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-18px)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(4deg)' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(201,162,39,0.5)' },
          '70%': { boxShadow: '0 0 0 14px rgba(201,162,39,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(201,162,39,0)' },
        },
        poleSpin: {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '0 80px' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        floatSlow: 'floatSlow 9s ease-in-out infinite',
        spinSlow: 'spinSlow 12s linear infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        pulseRing: 'pulseRing 2s infinite',
        poleSpin: 'poleSpin 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
