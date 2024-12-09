
import { get } from 'svelte/store';
import { createGeoJSONCircle, createGeoJSONCircleFeature } from '../geoMathsAssist';
import { ui_theme_store } from '../globalstores';
import { determineDarkModeToBool } from './determineDarkModeToBool';
export function addGeoRadius(map: maplibregl.Map) {
	const dark_mode = determineDarkModeToBool();

	try {
		map.addSource('km_source', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'km_line',
			type: 'line',
			source: 'km_source',
			paint: {
				'line-color': dark_mode ? '#dddddd' : '#121212',
				'line-width': 1.2,
				//'line-emissive-strength': 1
			}
		});

		map.addLayer({
			id: 'km_text',
			type: 'symbol',
			source: 'km_source',
			layout: {
				'text-field': ['get', 'label'],
				'symbol-placement': 'line',
				'text-size': 8,
				'symbol-spacing': 150,
				'text-ignore-placement': true,
				'text-allow-overlap': true
			},
			paint: {
				'text-color': dark_mode ? '#ffffff' : '#121212',
				'text-halo-color': dark_mode ? '#000030' : '#eeeeee',
				'text-halo-width': 2
			}
		});
	} catch (err) {
		console.error(err);
	}
}

export function setUserCircles(map: maplibregl.Map, lng: number, lat: number) {
	const km_source = map.getSource('km_source');
	const numberofpoints: number = 256;

	const distances = [1, 2, 5, 10, 20, 50];

	const feature_list = distances.map((dist) =>
		createGeoJSONCircleFeature([lng, lat], dist, numberofpoints)
	);

	if (km_source) {
		km_source.setData({
			type: 'FeatureCollection',
			features: feature_list
		});
	}
}
