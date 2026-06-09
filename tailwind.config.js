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
        surface: 'var(--surface)',
        'surface-soft': 'var(--surface-soft)',
        'surface-muted': 'var(--surface-muted)',
        'surface-hover': 'var(--surface-hover)',
        'border-soft': 'var(--border-soft)',
        'text-main': 'var(--text-main)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
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
