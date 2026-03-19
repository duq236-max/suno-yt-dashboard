/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind v4 — @tailwindcss/postcss 방식 (v4는 tailwind.config.js 불필요)
    "@tailwindcss/postcss": {},
  },
};

export default config;
