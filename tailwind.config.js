/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			animation: {
				fade: 'fadeOut 1s ease-in-out',
				progress: 'progress 1s infinite linear',
			},
			colors: {
				darksky: '#0a233f',
				seashore: '#42a7c5',
				background: '#06121F'
			},
			keyframes: {
				progress: {
				  '0%': { transform: ' translateX(0) scaleX(0)' },
				  '40%': { transform: 'translateX(0) scaleX(0.4)' },
				  '100%': { transform: 'translateX(100%) scaleX(0.5)' },
				},
			  },
			  transformOrigin: {
				'left-right': '0% 50%',
			  }
		}
	},
	plugins: []
};
