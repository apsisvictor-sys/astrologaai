import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Synthesis of Void Prism, Deep Nebula, and Ethereal Aura 
        primary: {
          DEFAULT: '#FF00FF', // Pure Neon Magenta
          light: '#FF55FF',
          dark: '#B300B3',
          glow: 'rgba(255, 0, 255, 0.5)',
        },
        secondary: {
          DEFAULT: '#FF00FF',
          light: '#FF55FF',
        },
        accent: {
          orange: '#FF5500',
          blue: '#00FFFF', // Pure Neon Electric Blue / Cyan
          pink: '#FF00AA', // Vibrant pink
        },
        background: {
          light: '#f8f5f8',
          dark: '#050510', // The Deep Nebula absolute dark
          deep: '#1a0b1c', // The Void Prism surface dark base
          surface: '#2d1633', // Void Prism surface dark
          surfaceHover: '#3b1c42', // Hover state
        },
        text: {
          primary: '#f1f5f9', // slate-100
          secondary: '#94a3b8', // slate-400
          muted: '#64748b', // slate-500
        },
        border: {
          glow: 'rgba(228, 26, 255, 0.3)', // New primary glow border
          subtle: 'rgba(255, 255, 255, 0.1)', // Clean white border 
        }
      },
      fontFamily: {
        display: ['Inter', 'Space Grotesk', 'sans-serif'], // Adjusted to Inter per Void Prism
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'vibrant-glow': 'radial-gradient(circle at center, rgba(255, 0, 255, 0.35) 0%, transparent 70%)',
        'cosmic-mesh': 'linear-gradient(to bottom right, #050510, #1a0b1c)',
      },
      boxShadow: {
        'panel': '0 8px 32px rgba(0, 0, 0, 0.8)',
        'glow-primary': '0 0 25px rgba(255, 0, 255, 0.6)',
        'glow-blue': '0 0 25px rgba(0, 255, 255, 0.6)',
        'glow-orange': '0 0 40px rgba(255, 85, 0, 0.7)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)', filter: 'brightness(1.2)' },
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
export default config
