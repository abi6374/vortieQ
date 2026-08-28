/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Action Blue — the single interactive accent for the whole app.
        // Old violet (#5B36E9) keys are kept so any surviving reference
        // resolves to the new palette instead of breaking.
        violet: {
          DEFAULT: '#0066CC',
          50: '#EAF2FC',
          100: '#DBEAFC',
          600: '#0066CC',
          700: '#004FA3',
          800: '#003D80',
        },
        pf: {
          navy: '#1D1D1F',
          slate: '#333333',
          muted: '#7A7A7A',
          bg: '#F5F5F7',
          border: '#E0E0E0',
          lavender: '#EAF2FC',
          lavenderCircle: '#DBEAFC',
          green: '#22A06B',
          greenSurface: '#ECFDF3',
          amber: '#D88700',
          amberSurface: '#FFF7E6',
        },
        brand: {
          50: '#EAF2FC',
          100: '#DBEAFC',
          500: '#0066CC',
          600: '#0066CC',
          700: '#004FA3',
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
          DEFAULT: '#0066CC',
          focus: '#0071E3',
          dark: '#2997FF',
          pressed: '#004FA3',
        },
      },
      fontFamily: {
        // SF Pro is Apple's system font; Inter is the documented open
        // substitute (DESIGN.md "Note on Font Substitutes").
        sans: ['"SF Pro Display"', '"SF Pro Text"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['"SF Pro Display"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        manrope: ['Inter', '-apple-system', 'sans-serif'],
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
