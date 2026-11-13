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
        "fade-in": "reveal 250ms ease-out both",
        pop: "pop 500ms ease-out forwards",
      },
    },
  },
  plugins: [],
};
