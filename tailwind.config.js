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
        'gray-dark': 'var(--gray-dark)',
        'gray-medium': 'var(--gray-medium)',
        'card-border': 'var(--card-border)',
      },
      boxShadow: {
        'card': 'var(--card-shadow)',
        'primary-glow': 'var(--shadow-primary-glow)',
        'success-glow': 'var(--shadow-success-glow)',
        'danger-glow': 'var(--shadow-danger-glow)',
        'danger-dark-glow': 'var(--shadow-danger-dark-glow)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}