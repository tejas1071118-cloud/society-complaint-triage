/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'Noto Sans Devanagari', 'sans-serif'],
      },
      colors: {
        background: 'var(--bg-main)',
        surface: 'var(--bg-surface)',
        'surface-hover': 'var(--bg-surface-hover)',
        border: 'var(--border-color)',
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5', // Brand Indigo
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        critical: {
          bg: 'var(--critical-bg)',
          text: 'var(--critical-text)',
          border: 'var(--critical-border)',
          icon: 'var(--critical-icon)'
        },
        high: {
          bg: 'var(--high-bg)',
          text: 'var(--high-text)',
          border: 'var(--high-border)',
          icon: 'var(--high-icon)'
        },
        medium: {
          bg: 'var(--medium-bg)',
          text: 'var(--medium-text)',
          border: 'var(--medium-border)',
          icon: 'var(--medium-icon)'
        },
        low: {
          bg: 'var(--low-bg)',
          text: 'var(--low-text)',
          border: 'var(--low-border)',
          icon: 'var(--low-icon)'
        },
        text: {
          main: 'var(--text-main)',
          muted: 'var(--text-muted)'
        }
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'float': '0 10px 30px -5px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'slide-in': 'slideIn 0.25s ease-out forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
