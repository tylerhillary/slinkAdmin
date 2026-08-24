import type { Config } from "tailwindcss";

/**
 * Design token architecture.
 *
 * Every colour is declared as raw HSL channels on `:root` / `[data-theme]`
 * in `app/globals.css`, then surfaced here through `hsl(var(--token) / <alpha-value>)`.
 * That keeps a single source of truth for theming while still allowing
 * Tailwind opacity modifiers (e.g. `bg-surface/60`, `border-line/40`).
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "hsl(var(--canvas) / <alpha-value>)",
        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          subtle: "hsl(var(--surface-subtle) / <alpha-value>)",
          raised: "hsl(var(--surface-raised) / <alpha-value>)",
        },
        line: {
          DEFAULT: "hsl(var(--line) / <alpha-value>)",
          strong: "hsl(var(--line-strong) / <alpha-value>)",
        },
        content: {
          DEFAULT: "hsl(var(--content) / <alpha-value>)",
          muted: "hsl(var(--content-muted) / <alpha-value>)",
          subtle: "hsl(var(--content-subtle) / <alpha-value>)",
          inverted: "hsl(var(--content-inverted) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          hover: "hsl(var(--accent-hover) / <alpha-value>)",
          soft: "hsl(var(--accent-soft) / <alpha-value>)",
          ring: "hsl(var(--accent-ring) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          soft: "hsl(var(--success-soft) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          soft: "hsl(var(--warning-soft) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          soft: "hsl(var(--danger-soft) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          soft: "hsl(var(--info-soft) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.5rem" }],
        lg: ["1rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em" }],
        xl: ["1.125rem", { lineHeight: "1.6rem", letterSpacing: "-0.014em" }],
        "2xl": ["1.375rem", { lineHeight: "1.85rem", letterSpacing: "-0.018em" }],
        "3xl": ["1.75rem", { lineHeight: "2.15rem", letterSpacing: "-0.022em" }],
      },
      borderRadius: {
        sm: "0.3125rem",
        DEFAULT: "0.4375rem",
        md: "0.5rem",
        lg: "0.625rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        xs: "0 1px 2px 0 hsl(var(--shadow) / 0.06)",
        sm: "0 1px 3px 0 hsl(var(--shadow) / 0.09), 0 1px 2px -1px hsl(var(--shadow) / 0.06)",
        md: "0 4px 12px -2px hsl(var(--shadow) / 0.10), 0 2px 4px -2px hsl(var(--shadow) / 0.06)",
        lg: "0 12px 28px -8px hsl(var(--shadow) / 0.18), 0 4px 10px -4px hsl(var(--shadow) / 0.10)",
        overlay: "0 24px 64px -16px hsl(var(--shadow) / 0.34)",
      },
      transitionDuration: { DEFAULT: "150ms" },
      transitionTimingFunction: { DEFAULT: "cubic-bezier(0.16, 1, 0.3, 1)" },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(-8px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slide-in-right 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 160ms cubic-bezier(0.16, 1, 0.3, 1)",
        "toast-in": "toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
