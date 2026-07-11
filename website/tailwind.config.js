/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        peach: '#f4b8a5',
        'peach-light': '#fde5db',
        'peach-mid': '#f0c4b0',
        'brand-purple': '#7c42b4',
        'brand-orange': '#d4845a',
        'brand-red': '#cc2222',
        'brand-gold': '#c8a045',
        'brand-teal': '#00b8b8',
        'btn-red': '#e84444',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Open Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
