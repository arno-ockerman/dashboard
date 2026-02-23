import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          burgundy: '#620E06',
          'burgundy-light': '#8a2018',
          green: '#425C59',
          amber: '#D5CBBA',
          platinum: '#E8E6E5',
          stardust: '#A1A09D',
          black: '#000000',
          white: '#FEFEFE',
        }
      },
      fontFamily: {
        bebas: ['Bebas Neue', 'sans-serif'],
        playfair: ['Playfair Display', 'serif'],
        'red-hat': ['Red Hat Display', 'sans-serif'],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
