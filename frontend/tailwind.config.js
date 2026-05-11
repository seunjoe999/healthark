/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // CompCare Hub — Refined Clinical Luxury
        slate: {
          50:  '#f8f9fb',
          100: '#f1f3f7',
          200: '#e4e8f0',
          300: '#cdd4e0',
          400: '#9aa5bb',
          500: '#6b7a97',
          600: '#4f5e78',
          700: '#3a4660',
          800: '#27334d',
          900: '#151f35',
          950: '#0d1526',
        },
        gold: {
          50:  '#fdf9ee',
          100: '#faf0d0',
          200: '#f5de9a',
          300: '#efc75f',
          400: '#e8b130',
          500: '#d4961a',
          600: '#b87712',
          700: '#935a10',
          800: '#794814',
          900: '#673c15',
        },
        rose: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        }
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(21,31,53,0.06), 0 4px 16px rgba(21,31,53,0.04)',
        'card-hover': '0 4px 8px rgba(21,31,53,0.08), 0 12px 32px rgba(21,31,53,0.08)',
        'sidebar': '4px 0 24px rgba(21,31,53,0.12)',
        'modal': '0 24px 64px rgba(21,31,53,0.2)',
        'input-focus': '0 0 0 3px rgba(212,150,26,0.15)',
      },
      backgroundImage: {
        'sidebar-grad': 'linear-gradient(160deg, #151f35 0%, #1e2d4a 40%, #27334d 100%)',
        'login-grad': 'linear-gradient(135deg, #0d1526 0%, #151f35 35%, #1e2d4a 70%, #27334d 100%)',
        'gold-grad': 'linear-gradient(135deg, #e8b130 0%, #d4961a 100%)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { '0%': { opacity: '0', transform: 'translateX(-12px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
    },
  },
  plugins: [],
}
