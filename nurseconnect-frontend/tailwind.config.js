/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // NurseConnect teal theme — matches oklch(0.55 0.12 180)
        teal: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',  // primary brand
          600: '#0d9488',  // primary hover
          700: '#0f766e',  // primary dark
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        brand: {
          DEFAULT: '#0d9488',
          light:   '#ccfbf1',
          dark:    '#0f766e',
          muted:   '#f0fdfa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.07)',
      },
    },
  },
  plugins: [],
}
