/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skeuo: {
          bg: '#2e323b',
          dark: '#252830',
          light: '#373c46',
          dim: '#21242a',
          highlight: '#3b404b',
          accent: '#6d5dfc', // A nice purple/blue accent
        }
      },
      boxShadow: {
        'skeuo': '6px 6px 12px #252830, -6px -6px 12px #373c46',
        'skeuo-sm': '3px 3px 6px #252830, -3px -3px 6px #373c46',
        'skeuo-inset': 'inset 6px 6px 12px #252830, inset -6px -6px 12px #373c46',
        'skeuo-inset-sm': 'inset 3px 3px 6px #252830, inset -3px -3px 6px #373c46',
        'skeuo-active': 'inset 4px 4px 8px #252830, inset -4px -4px 8px #373c46',
      },
      backgroundImage: {
        'skeuo-gradient': 'linear-gradient(145deg, #31363f, #292d35)',
        'skeuo-gradient-active': 'linear-gradient(145deg, #292d35, #31363f)',
      }
    },
  },
  plugins: [],
}
