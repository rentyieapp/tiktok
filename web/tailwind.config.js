import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [path.join(dir, 'index.html'), path.join(dir, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#060b13',
          900: '#0b1220',
          800: '#131d2e',
          700: '#1d2a3d',
          600: '#2c3a50',
          500: '#45536a',
          400: '#6b788e',
          300: '#98a3b6',
          200: '#c5cdda',
          100: '#e6eaf1',
          50: '#f4f6fa',
        },
        brand: {
          900: '#064e3b',
          800: '#065f46',
          700: '#047857',
          600: '#059669',
          500: '#10b981',
          400: '#34d399',
          300: '#6ee7b7',
          200: '#a7f3d0',
          100: '#d1fae5',
          50: '#ecfdf5',
        },
        flare: {
          600: '#d97706',
          500: '#f59e0b',
          400: '#fbbf24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['"Avenir Next"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"SFMono-Regular"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,18,32,0.04), 0 8px 24px -12px rgba(11,18,32,0.14)',
        float: '0 18px 50px -20px rgba(11,18,32,0.35)',
        glow: '0 0 0 1px rgba(52,211,153,0.35), 0 10px 40px -10px rgba(16,185,129,0.55)',
      },
      backgroundImage: {
        'hero-grid': 'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
      },
      animation: {
        'fade-up': 'fadeUp .5s cubic-bezier(.2,.8,.2,1) both',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'shimmer': 'shimmer 2.8s linear infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.55' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
