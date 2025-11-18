import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { execSync } from 'child_process';

import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';


export default defineConfig({
	preprocess: vitePreprocess(),
	plugins: [sveltekit(), tailwindcss(),
	
		VitePWA({
      // This is the key setting
      registerType: 'autoUpdate',
      
      // These options are often implied by 'autoUpdate' 
      // but are good to include explicitly.
      // This ensures the new service worker activates immediately.
      workbox: {
        skipWaiting: true,
        clientsClaim: true
      }
    })
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
		_COMMIT_ID: JSON.stringify(execSync('git rev-parse HEAD').toString().trim()),
		_COMMIT_DATE: JSON.stringify(
			execSync('git log -1 --format="%at" | xargs -I{} date -ud @{} \"+%Y-%m-%dT%H:%M:%SZ\"')
				.toString()
				.trim()
		)
	},
	preview: {
		allowedHosts: ['maps.catenarymaps.org']
	}
});
