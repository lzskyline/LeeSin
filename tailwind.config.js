/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lol: {
          gold: {
            DEFAULT: '#C89B3C',
            light: '#F0E6D2',
            dark: '#785A28',
            darker: '#463714',
            bright: '#D4A94A',
          },
          blue: {
            DEFAULT: '#0AC8B9',
            light: '#0FD8C9',
            dark: '#0A323C',
            darker: '#010A13',
            cyan: '#22D3EE',
          },
          bg: {
            primary: '#010A13',
            secondary: '#0A1428',
            tertiary: '#1E2328',
            card: '#0A1428',
            hover: '#141D29',
          },
          text: {
            primary: '#F0E6D2',
            secondary: '#A09B8C',
            muted: '#5B5A56',
            bright: '#FFFFFF',
          },
          border: {
            DEFAULT: '#785A28',
            light: '#C89B3C',
            dark: '#463714',
            subtle: '#2A2F35',
          },
          success: '#0AC8B9',
          error: '#E74C3C',
          warning: '#F39C12',
          purple: '#A855F7',
        }
      },
      fontFamily: {
        display: ['Beaufort for LOL', 'serif'],
        body: ['Spiegel', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      backgroundImage: {
        'lol-gradient': 'linear-gradient(180deg, #0A1428 0%, #010A13 100%)',
        'gold-gradient': 'linear-gradient(180deg, #C89B3C 0%, #785A28 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(200, 155, 60, 0.1) 0%, rgba(10, 20, 40, 0.8) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(30, 35, 40, 0.6) 0%, rgba(10, 20, 40, 0.9) 100%)',
        'button-gradient': 'linear-gradient(180deg, #1E2328 0%, #0A1428 50%, #0A0F14 100%)',
        'button-primary': 'linear-gradient(180deg, #C89B3C 0%, #A07628 50%, #785A28 100%)',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(200, 155, 60, 0.3)',
        'gold-strong': '0 0 30px rgba(200, 155, 60, 0.5)',
        'gold-glow': '0 0 40px rgba(200, 155, 60, 0.4), 0 0 80px rgba(200, 155, 60, 0.2)',
        'blue': '0 0 20px rgba(10, 200, 185, 0.3)',
        'blue-strong': '0 0 30px rgba(10, 200, 185, 0.5)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(200, 155, 60, 0.1)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(200, 155, 60, 0.15)',
        'inner-gold': 'inset 0 0 20px rgba(200, 155, 60, 0.1)',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'border-flow': 'border-flow 3s ease infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(200, 155, 60, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(200, 155, 60, 0.6)' },
        },
        'glow': {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      transitionTimingFunction: {
        'lol': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
