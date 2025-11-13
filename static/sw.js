importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = 'pwabuilder-page';
const offlineFallbackPage = 'offline.html';
const FILES_TO_CACHE = [
	'/', // Cache the root URL
	offlineFallbackPage
	// Add other files you want to cache initially
];

const CHECK_FOR_UPDATES_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

self.addEventListener('install', async (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES_TO_CACHE)));
});

if (workbox.navigationPreload.isSupported()) {
	workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
	if (event.request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					const preloadResp = await event.preloadResponse;

					if (preloadResp) {
						return preloadResp;
					}

					const networkResp = await fetch(event.request);
					return networkResp;
				} catch (error) {
					const cache = await caches.open(CACHE);
					const cachedResp = await cache.match(offlineFallbackPage);
					return cachedResp;
				}
			})()
		);
	} else {
		// For non-navigation requests, use network-first with cache fallback
		event.respondWith(
			caches.match(event.request).then((cachedResponse) => {
				return cachedResponse || fetch(event.request);
			})
		);
	}
});

async function checkForUpdates() {
	try {
		const cache = await caches.open(CACHE);
		for (const url of FILES_TO_CACHE) {
			const response = await fetch(url, { cache: 'no-store' }); // Force network fetch
			if (!response.ok) continue; // Skip if network fetch failed

			const cachedResponse = await cache.match(url);
			if (!cachedResponse) {
				// New file found, or previously failed fetch
				await cache.put(url, response.clone());
				console.log(`Updated cache for ${url}`);
			} else {
				const cachedBody = await cachedResponse.text();
				const networkBody = await response.clone().text();

				if (cachedBody !== networkBody) {
					// Content changed
					await cache.put(url, response.clone());
					console.log(`Updated cache for ${url}`);
				}
			}
		}
	} catch (error) {
		console.error('Error checking for updates:', error);
	}
}

function scheduleUpdates() {
	setInterval(checkForUpdates, CHECK_FOR_UPDATES_INTERVAL);
	checkForUpdates(); // Run immediately on service worker activation.
}

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			if ('navigationPreload' in self.registration) {
				await self.registration.navigationPreload.enable();
			}
			scheduleUpdates();
		})()
	);
	self.clients.claim();
});
