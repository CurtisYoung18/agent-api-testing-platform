/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f8ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#7CB5EC', // Main soft blue
          500: '#5A9BD5',
          600: '#4A8BC4',
          700: '#3A7BB3',
          800: '#2B6BA2',
          900: '#1C5B91',
        },
        soft: {
          blue: '#A8D0F0',
          gray: '#B4D7F1',
          accent: '#9EC5E8',
        },
        success: {
          DEFAULT: '#81C784',
          light: '#A5D6A7',
          dark: '#66BB6A',
        },
        warning: {
          DEFAULT: '#FFB74D',
          light: '#FFCC80',
          dark: '#FFA726',
        },
        error: {
          DEFAULT: '#E57373',
          light: '#EF9A9A',
          dark: '#EF5350',
        },
        text: {
          primary: '#2C3E50',
          secondary: '#5A7A95',
          tertiary: '#8FA9BA',
          light: '#B8CCD9',
        },
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(124, 181, 236, 0.12)',
        'glass-hover': '0 12px 40px 0 rgba(124, 181, 236, 0.18)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

