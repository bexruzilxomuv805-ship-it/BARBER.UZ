/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#2b2b2b',
          900: '#181818',
          950: '#0a0a0a',
        },
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
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        floatSlow: 'floatSlow 9s ease-in-out infinite',
        spinSlow: 'spinSlow 12s linear infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        pulseRing: 'pulseRing 2s infinite',
      },
    },
  },
  plugins: [],
}
