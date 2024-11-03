import type { Map } from 'maplibre-gl';

import { custom_icons_category_to_layer_id } from '../../globalstores';

export const new_jeans_buses: Record<string, Set<string>> = {
	'metro~losangeles': new Set(['5832'])
};

export const pride_buses: Record<string, Set<string>> = {
	'san-diego-mts': new Set(['824']),
	'metro~losangeles': new Set(['3854']),
	met: new Set(['4522'])
};

export function make_custom_icon_source(map: Map) {
	map.addSource('tokkibussource', {
		type: 'geojson',
		data: {
			type: 'FeatureCollection',
			features: []
		}
	});

	map.addSource('rainbowtrainsource', {
		type: 'geojson',
		data: {
			type: 'FeatureCollection',
			features: []
		}
	});

	map.addSource('rainbowbussource', {
		type: 'geojson',
		data: {
			type: 'FeatureCollection',
			features: []
		}
	});
}

export function add_bunny_layer(map: Map, layerspercategory: any) {
	custom_icons_category_to_layer_id.set({
		bus: ['tokkibuses', 'rainbow-buses'],
		localrail: ['rainbow-trains']
	});

	map.loadImage('/icons/rabbit_samsung.png', (error, image) => {
		if (image) {
			map.addImage('tokki', image);

			map.addLayer(
				{
					id: 'tokkibuses',
					source: 'tokkibussource',
					//filter: ['==', "type", "tokki"],
					type: 'symbol',
					paint: {
						'icon-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 10, 0.9]
					},
					layout: {
						'icon-image': 'tokki',
						'icon-allow-overlap': true,
						'icon-ignore-placement': true,
						//'icon-rotate': ['get', 'bearing'],
						//'icon-rotation-alignment': 'map',
						'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.15, 13, 0.25, 16, 0.4]
					},
					minzoom: 8
				},
				layerspercategory.bus.labeldots
			);
		}
	});

	map.loadImage('/icons/rainbow-flag.png', (error, image) => {
		if (image) {
			map.addImage('rainbow-flag', image);

			map.addLayer(
				{
					id: 'rainbow-buses',
					source: 'rainbowbussource',
					type: 'symbol',
					paint: {
						'icon-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 10, 0.9]
					},
					layout: {
						'icon-image': 'rainbow-flag',
						'icon-allow-overlap': true,
						'icon-ignore-placement': true,
						//'icon-rotate': ['get', 'bearing'],
						//'icon-rotation-alignment': 'map',
						'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.009, 13, 0.035]
					},
					minzoom: 8
				},
				layerspercategory.bus.labeldots
			);

			map.addLayer(
				{
					id: 'rainbow-trains',
					source: 'rainbowtrainsource',
					//filter: ['==', "type", "tokki"],
					type: 'symbol',
					paint: {
						'icon-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 10, 0.9]
					},
					layout: {
						'icon-image': 'rainbow-flag',
						'icon-allow-overlap': true,
						'icon-ignore-placement': true,
						//'icon-rotate': ['get', 'bearing'],
						//'icon-rotation-alignment': 'map',
						'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.03, 13, 0.05]
					},
					minzoom: 6
				},
				layerspercategory.localrail.labeldots
			);
		}
	});
}
