/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // CompCare Hub brand colours — purple and white
        navy: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4C1D95',  // primary deep purple
          950: '#3b0764',
        },
        teal: {
          500: '#7c3aed',  // mapped to purple for brand consistency
          600: '#6d28d9',
        },
        gold: {
          400: '#a78bfa',
          500: '#8b5cf6',
        },
        brand: {
          purple: '#4C1D95',
          light:  '#7c3aed',
          pale:   '#f5f3ff',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
