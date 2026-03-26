import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontSize: {
        'h1': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }],  // 28px
        'h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],       // 24px
        'h3': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],   // 20px
        'body': ['0.875rem', { lineHeight: '1.5rem', fontWeight: '400' }], // 14px
      },
      spacing: {
        'icon-h1': '1.75rem',  // 28px - H1과 같은 크기
        'icon-h2': '1.5rem',   // 24px - H2와 같은 크기
        'icon-h3': '1.25rem',  // 20px - H3와 같은 크기
        'icon-body': '1rem',   // 16px - 일반 텍스트용
        'control-h': '2.25rem', // 36px - 표준 컨트롤 높이 (버튼, 입력, 탭 등)
        'control-h-sm': '2rem', // 32px - 작은 컨트롤 높이
        'control-h-lg': '2.75rem', // 44px - 큰 컨트롤 높이
        'header-h': '3.75rem', // 60px - 헤더 높이 (그룹웨어 기준)
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // SSOO 전용 색상 (CSS 변수 기반)
        ssoo: {
          primary: 'var(--ssoo-primary)',
          'primary-hover': 'var(--ssoo-primary-hover)',
          secondary: 'var(--ssoo-secondary)',
          background: 'var(--ssoo-background)',
          'content-border': 'var(--ssoo-content-border)',
          'content-bg': 'var(--ssoo-content-background)',
          'sitemap-title': 'var(--ssoo-sitemap-title)',
          'sitemap-bullet': 'var(--ssoo-sitemap-bullet)',
          'sitemap-bg': 'var(--ssoo-sitemap-background)',
        },
        // LS CI 색상 팔레트
        ls: {
          blue: 'var(--ls-blue)',
          red: 'var(--ls-red)',
          'red-hover': '#d90027',           // hover 색상
          green: 'var(--ls-green)',
          'sub-blue': 'var(--ls-sub-blue)',
          gray: 'var(--ls-gray)',
          silver: 'var(--ls-silver)',
          gold: 'var(--ls-gold)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
