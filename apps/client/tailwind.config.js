/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fff6df',
        coral: '#ff5d6c',
        ink: '#14323c',
        panel: '#1b3f4c',
        gold: '#ffd56a',
        mint: '#7bed9f',
        turquoise: '#2ec4b6',
      },
      fontFamily: {
        display: ['Fredoka', 'Trebuchet MS', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
