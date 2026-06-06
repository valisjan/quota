/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-dark': 'var(--primary-dark)',
        secondary: 'var(--secondary)',
        danger: 'var(--danger)',
        'danger-dark': 'var(--danger-dark)',
        success: 'var(--success)',
        'success-dark': 'var(--success-dark)',
      },
      boxShadow: {
        'card': 'var(--card-shadow)',
        'primary-glow': 'var(--shadow-primary-glow)',
        'success-glow': 'var(--shadow-success-glow)',
        'danger-glow': 'var(--shadow-danger-glow)',
        'danger-dark-glow': 'var(--shadow-danger-dark-glow)',
      },
    },
  },
  plugins: [],
}
