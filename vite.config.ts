
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		sveltekit(),
		tailwindcss()
	],
	server: {
		fs: {
		  allow: ['../dist']
		}
	  },
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	build: {
		sourcemap: true,
		minify: true
	},
        define: {
                _BUILD_DATE: JSON.stringify(new Date().toISOString())
        }
});
