/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#021236',
          900: '#0a1d4c',
          100: '#e8efff',
          50: '#f4f7ff',
        },
        brand: {
          700: '#2455cd',
          600: '#2f63df',
          500: '#3970ee',
          300: '#91b2ff',
          100: '#e9f0ff',
          50: '#f5f8ff',
        },
        success: {
          600: '#3cb34e',
          100: '#e8f8eb',
        },
        paper: {
          0: '#ffffff',
          50: '#f8fbff',
        },
      },
      fontFamily: {
        sans: ['"Google Sans"', '"Google Sans Text"', '"Product Sans"', '"Public Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        soft: '0 18px 45px -24px rgba(2, 18, 54, 0.3)',
      }
    },
  },
  plugins: [],
}
