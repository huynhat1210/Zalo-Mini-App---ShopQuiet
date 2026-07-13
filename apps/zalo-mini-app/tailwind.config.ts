import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0e6877', // Figma Deep Teal
          light: '#ecf6f7',
          dark: '#0a4c57',
        },
        secondary: {
          DEFAULT: '#526069', // Soft Blue
          light: '#d3e2ed',
          dark: '#3b4951',
        },
        surface: {
          DEFAULT: '#fbf9f7', // Background canvas
          container: '#f0edeb',
          card: '#ffffff',
        },
        textColor: {
          DEFAULT: '#1b1c1b', // Deep Grey
          variant: '#434844',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '11.5': '2.875rem',
        '12.5': '3.125rem',
        '18': '4.5rem',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',  // 12px for standard cards/inputs
        lg: '1rem',     // 16px for primary product cards
        xl: '1.5rem',    // 24px for bottom sheets
      },
    },
  },
  plugins: [],
};
export default config;
