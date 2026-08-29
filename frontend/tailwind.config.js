/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Electric Sky Blue (#2DB1F9) — the primary interactive accent for the whole app.
        violet: {
          DEFAULT: '#2DB1F9',
          50: '#EAF6FD',
          100: '#D0EBFB',
          600: '#2DB1F9',
          700: '#0EA5E9',
          800: '#0284C7',
        },
        pf: {
          navy: '#1D1D1F',
          slate: '#333333',
          muted: '#7A7A7A',
          bg: '#F5F5F7',
          border: '#E0E0E0',
          lavender: '#EAF6FD',
          lavenderCircle: '#D0EBFB',
          green: '#22A06B',
          greenSurface: '#ECFDF3',
          amber: '#D88700',
          amberSurface: '#FFF7E6',
        },
        brand: {
          50: '#EAF6FD',
          100: '#D0EBFB',
          500: '#2DB1F9',
          600: '#2DB1F9',
          700: '#0EA5E9',
          900: '#1D1D1F',
        },
        // DESIGN.md tokens, named directly, for new/updated markup.
        ink: {
          DEFAULT: '#1D1D1F',
          80: '#333333',
          48: '#7A7A7A',
        },
        canvas: {
          DEFAULT: '#FFFFFF',
          parchment: '#F5F5F7',
          pearl: '#FAFAFC',
        },
        hairline: '#E0E0E0',
        divider: '#F0F0F0',
        action: {
          DEFAULT: '#2DB1F9',
          focus: '#38BDF8',
          dark: '#2DB1F9',
          pressed: '#0EA5E9',
        },
      },
      fontFamily: {
        // SF Pro is Apple's system font; Inter is the documented open substitute
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['"Big Shoulders Display"', '"Bebas Neue"', 'Inter', 'sans-serif'],
        balboa: ['"Bebas Neue"', '"Big Shoulders Display"', 'sans-serif'],
        shadow: ['"Shadows Into Light"', '"Caveat"', 'cursive'],
        manrope: ['Manrope', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', '"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.374px',
        tighter: '-0.28px',
      },
      borderRadius: {
        // DESIGN.md radius scale — remaps every rounded-* utility already
        // used across the app to the Apple system in one place.
        none: '0px',
        sm: '8px',
        DEFAULT: '8px',
        md: '11px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '28px',
        full: '9999px',
      },
      boxShadow: {
        // Whisper-soft, hue-tinted elevation instead of generic gray
        // Tailwind shadows — used only where elevation communicates
        // real hierarchy (DESIGN.md "Elevation & Depth").
        xs: '0 1px 2px rgba(29,29,31,0.04)',
        sm: '0 1px 3px rgba(29,29,31,0.05), 0 1px 2px rgba(29,29,31,0.04)',
        DEFAULT: '0 2px 8px rgba(29,29,31,0.05)',
        md: '0 4px 16px rgba(29,29,31,0.06)',
        lg: '0 12px 32px rgba(29,29,31,0.08)',
        xl: '0 20px 48px rgba(29,29,31,0.10)',
        '2xl': '0 28px 64px rgba(29,29,31,0.14)',
        focus: '0 0 0 3px rgba(0,102,204,0.20)',
        product: '3px 5px 30px rgba(0,0,0,0.22)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-468px 0' },
          '100%': { backgroundPosition: '468px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
