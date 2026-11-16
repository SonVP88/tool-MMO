/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f141c',
          panel: '#151c27',
          surface: '#1b2332',
          border: '#253246',
          header: '#121822',
          input: '#121824',
          hover: '#222d40',
        },
        brand: {
          green: '#10b981',
          'green-dark': '#059669',
          blue: '#0284c7',
          'blue-dark': '#0369a1',
          orange: '#f97316',
          'orange-dark': '#ea580c',
          red: '#ef4444',
          purple: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
