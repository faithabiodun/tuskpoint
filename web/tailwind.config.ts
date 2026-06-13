import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TuskPoint palette — deep teal-ink base matching the Walrus brand.
        ink: {
          950: "#03100f",
          900: "#061817",
          800: "#0a221f",
          700: "#102e2a",
          600: "#173d38",
          500: "#214f48",
        },
        // Primary brand accent — Walrus mint/teal (replaces the old flame orange).
        // Kept under the `flame` token name so every component inherits it.
        flame: {
          DEFAULT: "#2fd4c0",
          soft: "#6ee7d6",
          bright: "#48ddca",
          deep: "#0fb3a1",
          ember: "#d4f7f1",
        },
        // Secondary accent — Walrus mint highlight.
        teal: {
          DEFAULT: "#34d2c0",
          soft: "#99efe4",
          deep: "#0e9a8b",
        },
        accent: {
          DEFAULT: "#5fe0cf",
          soft: "#a7f0e6",
        },
        line: "rgba(153,239,228,0.10)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(47,212,192,0.20), 0 10px 44px -10px rgba(47,212,192,0.38)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "radial-flame":
          "radial-gradient(60% 50% at 50% 0%, rgba(47,212,192,0.20) 0%, rgba(15,179,161,0.06) 42%, transparent 76%)",
        "radial-teal":
          "radial-gradient(60% 50% at 50% 0%, rgba(52,210,192,0.18) 0%, rgba(153,239,228,0.06) 40%, transparent 75%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0) rotate(-1deg)" },
          "50%": { transform: "translateY(-18px) rotate(1.5deg)" },
        },
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        shimmer: "shimmer 2s infinite",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 32s linear infinite",
      },
      fontSize: {
        display: ["clamp(2.75rem, 8vw, 7rem)", { lineHeight: "0.92", letterSpacing: "-0.03em" }],
        "display-sm": ["clamp(2rem, 5.5vw, 4rem)", { lineHeight: "0.96", letterSpacing: "-0.025em" }],
      },
    },
  },
  plugins: [],
};

export default config;
