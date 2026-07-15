import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lotto: {
          navy: "#10234A",
          violet: "#6557E8",
          blue: "#3C84ED",
          yellow: "#FFD84B",
        },
      },
      boxShadow: {
        ticket: "0 32px 70px rgba(4, 13, 43, 0.34)",
        card: "0 22px 60px rgba(19, 33, 64, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
