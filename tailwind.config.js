/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			animation: {
				fade: 'fadeOut 1s ease-in-out'
			},
			colors: {
				darksky: '#0a233f',
				seashore: '#42a7c5'
			}
		}
	},
	plugins: []
};
