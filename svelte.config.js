import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
//import adapter from '@sveltejs/adapter-cloudflare';
import adapter from 'svelte-adapter-deno';

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { execSync } from 'node:child_process';

import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

//import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
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
		minify: false
	 },
	define: {
		_COMMIT_ID: JSON.stringify(execSync('git rev-parse HEAD').toString().trim()),
		_COMMIT_DATE: JSON.stringify(
			execSync('git log -1 --format="%at" | xargs -I{} date -ud @{} \"+%Y-%m-%dT%H:%M:%SZ\"')
				.toString()
				.trim()
		)
	},
	kit: {
		adapter: adapter()
	},
	preview: {
		allowedHosts: ['maps.catenarymaps.org']
	}
};

export default config;
