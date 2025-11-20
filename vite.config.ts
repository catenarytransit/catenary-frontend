import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { execSync } from 'child_process';

import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';


export default defineConfig({
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
	preview: {
		allowedHosts: ['maps.catenarymaps.org']
	}
});
