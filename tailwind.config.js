/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        fade: 'fadeOut 1s ease-in-out',
      },
    },
  },
  plugins: [],
}

