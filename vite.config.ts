import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { sentryVitePlugin } from '@sentry/vite-plugin';

import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		sentryVitePlugin({
			org: process.env.SENTRY_ORG,
			project: process.env.SENTRY_PROJECT,
			authToken: process.env.SENTRY_AUTH_TOKEN
		  }),
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
	}
});
