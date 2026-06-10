import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TuskPoint palette — dark, walrus-deep navy with cyan/teal accents.
        ink: {
          950: "#070b14",
          900: "#0a0f1c",
          800: "#0f1626",
          700: "#161f33",
          600: "#1e2942",
          500: "#2a3754",
        },
        teal: {
          DEFAULT: "#22d3ee",
          soft: "#67e8f9",
          deep: "#0891b2",
        },
        accent: {
          DEFAULT: "#7c5cff",
          soft: "#a78bfa",
        },
        line: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.15), 0 8px 40px -8px rgba(34,211,238,0.25)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "radial-teal":
          "radial-gradient(60% 50% at 50% 0%, rgba(34,211,238,0.18) 0%, rgba(124,92,255,0.06) 40%, transparent 75%)",
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
