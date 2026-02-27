import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1F4E79',
          mid: '#2E75B6',
          light: '#DEEAF1',
          border: '#BDD7EE',
        },
        correct: {
          dark: '#375623',
          fill: '#E2EFDA',
        },
        wrong: {
          dark: '#C62828',
          fill: '#FFEBEE',
        },
      },
    },
  },
  plugins: [],
};

export default config;
