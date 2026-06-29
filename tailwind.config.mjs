/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Pi Kappa Alpha — Garnet & Old Gold, tuned for a dark UI
        garnet: {
          50: '#fbeaec',
          100: '#f4c6cb',
          200: '#e88e98',
          300: '#dc5664',
          400: '#c92f40',
          500: '#a51c2c',
          600: '#7b1113',
          700: '#5f0d0f',
          800: '#46090b',
          900: '#2e0607',
          950: '#1a0304'
        },
        gold: {
          50: '#fdf9ec',
          100: '#f8edc6',
          200: '#f0d889',
          300: '#e7c14d',
          400: '#d9a82a',
          500: '#c9a227',
          600: '#a37e1c',
          700: '#7c5d17',
          800: '#5a4214',
          900: '#3d2c11'
        },
        ink: {
          50: '#f5f6f8',
          100: '#e7e9ee',
          200: '#c9cdd6',
          400: '#8b90a0',
          700: '#272a33',
          800: '#191b22',
          900: '#101218',
          950: '#0a0b10'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif']
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)',
        glow: '0 0 0 1px rgba(201,162,39,0.25), 0 8px 30px rgba(123,17,19,0.25)'
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pop: { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } }
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        pop: 'pop 0.2s ease-out'
      }
    }
  },
  plugins: []
}
