import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system colors from 06-ux-ui-design.md (EXACT SPEC)
        // Primary Colors
        primary: '#7C3AED',
        'primary-dark': '#5B21B6',
        secondary: '#EC4899',
        'secondary-light': '#F472B6',
        // Background Colors
        background: {
          primary: '#0A0A0F',
          secondary: '#12121A',
          tertiary: '#1A1A25',
        },
        surface: {
          DEFAULT: '#252532',
          elevated: '#303040',
        },
        // Text Colors
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
          muted: '#71717A',
          subtle: '#52525B',
        },
        // Accent Colors
        stellar: {
          gold: '#FBBF24',
          silver: '#E5E7EB',
        },
        mars: '#EF4444',
        venus: '#F472B6',
        jupiter: '#FB923C',
        saturn: '#D4D4D8',
        neptune: '#2DD4BF',
        cosmic: {
          blue: '#60A5FA',
        },
        // Semantic Colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Legacy aliases for backwards compatibility
        cosmic: {
          black: '#0A0A0F',
          dark: '#12121A',
          medium: '#1A1A25',
          light: '#252532',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.5)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
export default config
