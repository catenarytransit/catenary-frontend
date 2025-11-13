import { get, writable } from 'svelte/store';
import {
	current_orm_layer_theme_is_dark_mode_store,
	current_orm_layer_type_store
} from '../globalstores';

// Store for caching ORM style files
const ormStyleCache = writable<Record<string, any>>({});

// Function to preload all ORM style files
export async function preloadORMStyles() {
	try {
		if (typeof window === 'undefined') {
			return;
		}

		const styleFiles = [
			{ key: 'infrastructure-dark', url: '/orm_styles/standard-dark.json' },
			{ key: 'infrastructure-light', url: '/orm_styles/standard-light.json' },
			{ key: 'speed-dark', url: '/orm_styles/speed-dark.json' },
			{ key: 'speed-light', url: '/orm_styles/speed-light.json' }
		];

		try {
			const results = await Promise.all(
				styleFiles.map(async ({ key, url }) => {
					const response = await fetch(url);
					const style = await response.json();
					return { key, style };
				})
			);

			const cache: Record<string, any> = {};
			results.forEach(({ key, style }) => {
				cache[key] = style;
			});

			ormStyleCache.set(cache);
			console.log('Preloaded ORM styles');
		} catch (error) {
			console.error('Failed to preload ORM styles:', error);
		}
	} catch (e) {
		console.error(e);
	}
}

export function switch_orm_layers(
	map: maplibregl.Map,
	layer_type: string | null,
	dark_mode: boolean
) {
	try {
		if (typeof window === 'undefined') {
			return;
		}

		console.log('switch_orm_layers', layer_type, dark_mode);

		// Remove existing ORM layers
		const layers = map.getStyle().layers;
		layers.forEach((layer) => {
			if (layer.id.startsWith('orm_')) {
				map.removeLayer(layer.id);
			}
		});

		if (layer_type === null) {
			return;
		}

		const theme = dark_mode ? 'dark' : 'light';
		const styleKey = `${layer_type}-${theme}`;
		const cache = get(ormStyleCache);

		if (cache[styleKey]) {
			// Use cached style
			applyStyle(map, cache[styleKey], dark_mode, layer_type);
		} else {
			// Fallback to fetch if cache miss
			let url = dark_mode ? '/orm_styles/standard-dark.json' : '/orm_styles/standard-light.json';
			if (layer_type === 'speed') {
				url = dark_mode ? '/orm_styles/speed-dark.json' : '/orm_styles/speed-light.json';
			}

			fetch(url)
				.then((response) => response.json())
				.then((style) => {
					// Cache the style
					const updatedCache = get(ormStyleCache);
					updatedCache[styleKey] = style;
					ormStyleCache.set(updatedCache);

					applyStyle(map, style, dark_mode, layer_type);
				})
				.catch((e) => {
					console.error(e);
				});
		}
	} catch (e) {
		console.error(e);
	}
}

function applyStyle(map: maplibregl.Map, style: any, dark_mode: boolean, layer_type: string) {
	try {
		// Add each layer to the map, prefix with 'orm_'
		style.layers.forEach((layer: any) => {
			const newLayer = { ...layer };
			newLayer.id = 'orm_' + layer.id;

			if (newLayer.id == 'orm_railway_switch' || newLayer.id == 'orm_railway_text_stations_high') {
				map.addLayer(newLayer);
			} else {
				map.addLayer(newLayer, 'intercityrailshapes');
			}
		});

		// Update stores
		current_orm_layer_theme_is_dark_mode_store.set(dark_mode);
		current_orm_layer_type_store.set(layer_type);
	} catch (e) {
		console.error(e);
	}
}
