/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        paper: '#fafaf9',
        risk: { low: '#16a34a', elevated: '#d97706', high: '#ea580c', fraud: '#dc2626' }
      }
    }
  },
  plugins: []
}
