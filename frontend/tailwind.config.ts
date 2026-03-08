import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'background-deep':  '#0D0010',
        'background-dark':  '#1a0b1c',
        'surface':          '#2d1633',
        'surface-light':    '#3d1f45',
        'primary':          '#e41aff',
        'primary-dim':      'rgba(228, 26, 255, 0.15)',
        'accent-cyan':      '#00f0ff',
        'accent-pink':      '#ff0080',
        'accent-amber':     '#FBBF24',
        'text-primary':     '#FAFAFA',
        'text-secondary':   '#CBD5E1',
        'text-muted':       '#64748B',
        'border-subtle':    'rgba(255, 255, 255, 0.07)',
        'pro-gold':         '#F59E0B',
        'premium-purple':   '#8B5CF6',
      },
      fontFamily: {
        sans:    ['Space Grotesk', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm':    '8px',
        DEFAULT: '12px',
        'lg':    '16px',
        'xl':    '24px',
        '2xl':   '32px',
        'full':  '9999px',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(228, 26, 255, 0.3)',
        'glow-cyan':    '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-pink':    '0 0 20px rgba(255, 0, 128, 0.3)',
        'panel':        '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'float':          'float 6s ease-in-out infinite',
        'pulse-slow':     'pulse 3s ease-in-out infinite',
        'fade-in':        'fadeIn 0.4s ease-out',
        'slide-up':       'slideUp 0.4s ease-out',
        'slide-in-left':  'slideInLeft 0.3s ease-out',
        'expand-chat':    'expandChat 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        expandChat: {
          from: { opacity: '0', height: '60px' },
          to:   { opacity: '1', height: '480px' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
