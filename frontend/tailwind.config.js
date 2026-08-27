/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          DEFAULT: '#5B36E9',
          50: '#F5F1FF',
          100: '#EEE9FF',
          600: '#5B36E9',
          700: '#4826C9',
          800: '#381CA6',
        },
        pf: {
          navy: '#0E1B38',
          slate: '#52617D',
          muted: '#74819A',
          bg: '#F5F7FC',
          border: '#D8DFEB',
          lavender: '#F5F1FF',
          lavenderCircle: '#EEE9FF',
          green: '#22A06B',
          greenSurface: '#ECFDF3',
          amber: '#D88700',
          amberSurface: '#FFF7E6',
        },
        brand: {
          50: '#F5F1FF',
          100: '#EEE9FF',
          500: '#5B36E9',
          600: '#5B36E9',
          700: '#4826C9',
          900: '#0E1B38'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        manrope: ['Manrope', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

