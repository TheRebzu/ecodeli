import type { Config } from "tailwindcss"
import { fontFamily } from "tailwindcss/defaultTheme"

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        md: "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Couleurs spécifiques à EcoDeli
        ecodeli: {
          50: "#f0f9f4",
          100: "#dcf1e6",
          200: "#bae4d0",
          300: "#8ed0b3",
          400: "#5db690",
          500: "#3c9d76",
          600: "#2b7f5f",
          700: "#25664e",
          800: "#215240",
          900: "#1d4437",
          950: "#0d261f",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        heading: ["var(--font-heading)", ...fontFamily.sans],
      },
      fontSize: {
        "2xs": "0.625rem", // 10px
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "subtle-lg": "0 2px 4px 0 rgb(0 0 0 / 0.05)",
        highlight: "0 0 0 2px rgba(92, 182, 144, 0.2)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        slideIn: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-25%)" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in",
        "fade-out": "fadeOut 0.3s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        bounce: "bounce 1s infinite",
        spin: "spin 1s linear infinite",
      },
      transitionDuration: {
        "400": "400ms",
      },
      transitionTimingFunction: {
        "bounce": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "in-out-fast": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      gridTemplateColumns: {
        "fit": "repeat(auto-fit, minmax(300px, 1fr))",
        "fill": "repeat(auto-fill, minmax(300px, 1fr))",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      backdropBlur: {
        xs: "2px",
      },
      typography: {
        DEFAULT: {
          css: {
            a: {
              color: 'var(--tw-prose-links)',
              textDecoration: 'none',
              fontWeight: '500',
              '&:hover': {
                color: 'var(--tw-prose-links-hover)',
                textDecoration: 'underline',
              },
            },
            'h1, h2, h3, h4, h5, h6': {
              fontFamily: 'var(--font-heading)',
            },
            code: {
              backgroundColor: 'var(--tw-prose-code-bg)',
              borderRadius: '0.25rem',
              padding: '0.2em 0.4em',
              fontSize: '0.9em',
            },
          },
        },
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['active', 'group-hover'],
      textColor: ['active', 'group-hover'],
      borderColor: ['active', 'focus-visible'],
      opacity: ['disabled'],
      scale: ['group-hover'],
      transform: ['group-hover', 'hover'],
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/aspect-ratio'),
    // Plugin personnalisé pour les variants de sélection de texte
    function({ addUtilities }) {
      const newUtilities = {
        '.select-none': {
          'user-select': 'none',
        },
        '.select-text': {
          'user-select': 'text',
        },
        '.select-all': {
          'user-select': 'all',
        },
        '.select-auto': {
          'user-select': 'auto',
        },
      }
      addUtilities(newUtilities)
    },
    // Plugin pour les styles de scrollbar
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-thin': {
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgb(var(--background) / 0.1)',
            borderRadius: '100vh',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgb(var(--foreground) / 0.2)',
            borderRadius: '100vh',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgb(var(--foreground) / 0.3)',
          },
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      }
      addUtilities(newUtilities)
    },
  ],
} satisfies Config