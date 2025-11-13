import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

import { browser } from '$app/environment';

export const livedotscaling_store: Writable<Number> = writable(1.0);

if (browser) {
	const stored = localStorage.getItem('livedotscaling');
	if (stored) {
		livedotscaling_store.set(parseFloat(stored));
	}

	livedotscaling_store.subscribe((value) => {
		localStorage.setItem('livedotscaling', value.toString());
	});
}
