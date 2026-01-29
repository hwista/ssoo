/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontSize: {
  			h1: [
  				'1.75rem',
  				{
  					lineHeight: '2.25rem',
  					fontWeight: '700'
  				}
  			],
  			h2: [
  				'1.5rem',
  				{
  					lineHeight: '2rem',
  					fontWeight: '600'
  				}
  			],
  			h3: [
  				'1.25rem',
  				{
  					lineHeight: '1.75rem',
  					fontWeight: '600'
  				}
  			],
  			body: [
  				'0.875rem',
  				{
  					lineHeight: '1.5rem',
  					fontWeight: '400'
  				}
  			]
  		},
  		spacing: {
  			'icon-h1': '1.75rem',
  			'icon-h2': '1.5rem',
  			'icon-h3': '1.25rem',
  			'icon-body': '1rem',
  			'control-h': '2.25rem',
  			'control-h-sm': '2rem',
  			'control-h-lg': '2.75rem',
  			'header-h': '3.75rem'
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			ssoo: {
  				primary: 'var(--ssoo-primary)',
  				'primary-hover': 'var(--ssoo-primary-hover)',
  				secondary: 'var(--ssoo-secondary)',
  				background: 'var(--ssoo-background)',
  				'content-border': 'var(--ssoo-content-border)',
  				'content-bg': 'var(--ssoo-content-background)',
  				'sitemap-title': 'var(--ssoo-sitemap-title)',
  				'sitemap-bullet': 'var(--ssoo-sitemap-bullet)',
  				'sitemap-bg': 'var(--ssoo-sitemap-background)'
  			},
  			ls: {
  				blue: 'var(--ls-blue)',
  				red: 'var(--ls-red)',
  				'red-hover': '#d90027',
  				green: 'var(--ls-green)',
  				'sub-blue': 'var(--ls-sub-blue)',
  				gray: 'var(--ls-gray)',
  				silver: 'var(--ls-silver)',
  				gold: 'var(--ls-gold)'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
};