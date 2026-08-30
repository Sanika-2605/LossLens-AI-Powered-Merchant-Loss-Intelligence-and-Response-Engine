/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0f17',
        card: '#131b29',
        border: '#1f293d',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        accent: '#8b5cf6',
        danger: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
      }
    },
  },
  plugins: [],
}
