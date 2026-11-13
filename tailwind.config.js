const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // `xs` must come before the defaults so it sorts first in the cascade
    screens: {
      xs: "375px",
      ...defaultTheme.screens,
    },
    extend: {
      colors: {
        "oec-orange": "#FFA63F",
        "oec-yellow": "#FFD422",
      },
      keyframes: {
        reveal: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
        conceal: {
          "0%": {
            opacity: "1",
          },
          "100%": {
            opacity: "0",
          },
        },
        pop: {
          "0%": {
            transform: "scale(1)",
          },
          "75%": {
            transform: "scale(1.25)",
          },
          "100%": {
            transform: "scale(1)",
          },
        },
      },
      animation: {
        reveal: "reveal 200ms forwards",
        // Section switch in the treemap: the old tiles fade out, then the new
        // ones fade in, so the two layouts are never visible on top of
        // each other.
        "fade-out": "conceal 120ms ease-in forwards",
        "fade-in": "reveal 180ms ease-out 100ms both",
        pop: "pop 500ms ease-out forwards",
      },
    },
  },
  plugins: [],
};
