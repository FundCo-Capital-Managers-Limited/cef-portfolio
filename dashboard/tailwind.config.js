/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Pulled from the Clean Energy Local Currency Fund logo.
        brand: {
          navy: '#1B2A6B',
          blue: '#2D8FE0',
          teal: '#22B0C7',
          green: '#4CAF6D',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #2D8FE0 0%, #22B0C7 50%, #4CAF6D 100%)',
      },
    },
  },
  plugins: [],
};
