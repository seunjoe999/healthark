/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3f9',
          100: '#dde4f0',
          200: '#c3cfe4',
          300: '#9aafd3',
          400: '#6b88bc',
          500: '#4d6aa8',
          600: '#3c548e',
          700: '#324474',
          800: '#2c3b61',
          900: '#0D2B5E',
          950: '#0a1f46',
        },
        teal: {
          500: '#0A7B6F',
          600: '#086b60',
        },
        gold: {
          400: '#d4a820',
          500: '#C8A415',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
