import type { Map } from 'maplibre-gl';
import { layerspercategory } from '../layernames';
import {default_interrail_filter, 

	default_bus_filter, default_metro_filter, default_tram_filter} from '../makeFiltersForStop';

const internationalIntercityLabelSize = ['interpolate', ['linear'], ['zoom'], 6, 8, 12, 12];
const internationalIntercityCircleSize = [
	'interpolate',
	['linear'],
	['zoom'],
	7,
	2.8,
	12,
	5,
	15,
	8
];

function getCircleInside(darkMode: boolean) {
	return darkMode ? '#1c2636' : '#ffffff';
}

function getCircleOutside(darkMode: boolean) {
	return darkMode ? '#ffffff': '#1c2636';
}

export function bus_stop_stop_color(darkMode: boolean) {
	return darkMode ? ['step', ['zoom'], '#e0e0e0', 14, '#dddddd'] : '#333333';
}

export function addStopsLayers(map: Map, darkMode: boolean) {
	//BUS

	map.addLayer({
		id: layerspercategory.bus.stops,
		type: 'circle',
		source: 'busstops',
		'source-layer': 'data',
		layout: {},
		paint: {
			'circle-color': '#1c2636',
			'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 0.9, 12, 1.2, 13, 2],
			'circle-stroke-color': bus_stop_stop_color(darkMode),
			'circle-stroke-width': ['step', ['zoom'], 0.8, 12, 1.2, 13.2, 1.5],
			'circle-stroke-opacity': ['step', ['zoom'], 0.5, 15, 0.6],
			'circle-opacity': 0.1,
			//'circle-emissive-strength': 1
		},
		minzoom: window?.innerWidth >= 768 ? 13 : 11.5,
		filter: default_bus_filter,
	});

	map.addLayer({
		id: layerspercategory.bus.labelstops,
		type: 'symbol',
		source: 'busstops',
		'source-layer': 'data',
		filter: default_bus_filter,
		layout: {
			'text-field': ['get', 'displayname'],
			//'text-field': ['coalesce', ['get', 'route_types']],
			'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
			'text-size': ['interpolate', ['linear'], ['zoom'], 13, 7, 15, 8, 16, 10],
			'text-radial-offset': 0.5,
			//'text-ignore-placement': false,
			//'icon-ignore-placement': false,
			//'text-allow-overlap': true,
			//'symbol-avoid-edges': false,
			'text-font': ['Barlow-Medium']
		},
		paint: {
			'text-color': darkMode ? '#eee6fe' : '#2a2a2a',
			'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
			'text-halo-width': 0.4,
			//'text-emissive-strength': 1
		},
		minzoom: window?.innerWidth >= 768 ? 14.7 : 13.7
	});

	//LOCAL RAIL

	map.addLayer({
		id: layerspercategory.metro.stops,
		type: 'circle',
		source: 'railstops',
		'source-layer': 'data',
		layout: {},
		paint: {
			'circle-color': getCircleInside(darkMode),
			'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 4, 15, 5],
			'circle-stroke-color': getCircleOutside(darkMode),
			'circle-stroke-width': ['step', ['zoom'],0.4, 10.5, 0.8, 11, 1.2, 13.2, 1.5],
			'circle-stroke-opacity': ['step', ['zoom'], 0.5, 15, 0.6],
			'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 16, 0.8],
			//'circle-emissive-strength': 1
		},
		minzoom: 9,
		filter: default_metro_filter,
	});

	map.addLayer({
		id: layerspercategory.metro.labelstops,
		type: 'symbol',
		source: 'railstops',
		'source-layer': 'data',
		layout: {
			'text-field': ['get', 'displayname'],
			'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
			'text-size': ['interpolate', ['linear'], ['zoom'], 9, 9, 11, 9, 12, 12],
			'text-radial-offset': ['interpolate', ['linear'], ['zoom'], 7, 0.1, 10, 0.35, 12, 0.6],
			//'text-ignore-placement': true,
			//'icon-ignore-placement': false,
			//'text-allow-overlap': true,
			//'symbol-avoid-edges': false,
			'text-font': ['Barlow-Medium']
		},
		paint: {
			'text-color': darkMode ? '#ffffff' : '#2a2a2a',
			'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
			'text-halo-width': 1,
			//'text-emissive-strength': 1
		},
		filter:default_metro_filter,
		minzoom: 10.2
	});

	// TRAMS

	map.addLayer({
		id: layerspercategory.tram.stops,
		type: 'circle',
		source: 'railstops',
		'source-layer': 'data',
		layout: {},
		paint: {
			'circle-color':  getCircleInside(darkMode),
			'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 10, 1, 12, 3, 15, 4],
			'circle-stroke-color': getCircleOutside(darkMode),
			'circle-stroke-width': ['step', ['zoom'], 1.2, 13.2, 1.5],
			'circle-stroke-opacity': ['step', ['zoom'], 0.4, 11, 0.5, 15, 0.6],
			'circle-opacity': 0.8,
			//'circle-emissive-strength': 1
		},
		minzoom: 9,
		filter: default_tram_filter
	});

	map.addLayer({
		id: layerspercategory.tram.labelstops,
		type: 'symbol',
		source: 'railstops',
		'source-layer': 'data',
		layout: {
			'text-field': ['get', 'displayname'],
			'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
			'text-size': ['interpolate', ['linear'], ['zoom'], 9, 7, 11, 7, 12, 9, 14, 10],
			'text-radial-offset': ['interpolate', ['linear'], ['zoom'], 7, 0.2, 10, 0.3, 12, 0.5],
			//'text-ignore-placement': true,
			//'icon-ignore-placement': false,
			//'text-allow-overlap': true,
			//'symbol-avoid-edges': false,
			'text-font': ['step', ['zoom'], ['literal', ['Barlow-Regular']], 12, ['literal', ['Barlow-Medium']]]
		},
		paint: {
			'text-color': darkMode ? '#ffffff' : '#2a2a2a',
			'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
			'text-halo-width': 1,
			//'text-emissive-strength': 1
		},
		filter: default_tram_filter,
		minzoom: 10
	});

	//INTERCITY RAIL

	map.addLayer({
		id: layerspercategory.intercityrail.stops,
		type: 'circle',
		source: 'railstops',
		'source-layer': 'data',
		layout: {},
		paint: {
			'circle-color': getCircleInside(darkMode),
			'circle-radius': internationalIntercityCircleSize,
			'circle-stroke-color': getCircleOutside(darkMode),
			'circle-stroke-width': ['step', ['zoom'], 1.2, 13.2, 1.5],
			'circle-stroke-opacity': ['step', ['zoom'], 0.5, 15, 0.6],
			'circle-opacity': 0.8,
			//'circle-emissive-strength': 1
		},
		minzoom: 7.7,
		filter: default_interrail_filter
	});

	map.addLayer({
		id: layerspercategory.intercityrail.labelstops,
		type: 'symbol',
		source: 'railstops',
		'source-layer': 'data',
		layout: {
			'text-field': ['get', 'displayname'],
			'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
			'text-size': internationalIntercityLabelSize,
			'text-radial-offset': 0.2,
			//'text-ignore-placement': true,
			//'icon-ignore-placement': false,
			//'text-allow-overlap': true,
			//'symbol-avoid-edges': false,
			'text-font': ['literal', ['Barlow-Medium']]
		},
		paint: {
			'text-color': darkMode ? '#ffffff' : '#2a2a2a',
			'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
			'text-halo-width': 1,
			//'text-emissive-strength': 1
		},
		filter: default_interrail_filter,
		minzoom: 7.7
	});

	//OTHER

	map.addLayer({
		id: layerspercategory.other.stops,
		type: 'circle',
		source: 'otherstops',
		'source-layer': 'data',
		layout: {},
		paint: {
			'circle-color': getCircleInside(darkMode),
			'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 4, 15, 5],
			'circle-stroke-color': getCircleOutside(darkMode),
			'circle-stroke-width': ['step', ['zoom'], 1.2, 13.2, 1.5],
			'circle-stroke-opacity': ['step', ['zoom'], 0.5, 15, 0.6],
			'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 16, 0.8],
			//'circle-emissive-strength': 1
		},
		filter: ['all', ['any', ['>', ['zoom'], 16], ['==', null, ['get', 'parent_station']]]],
		minzoom: 9
	});

	map.addLayer({
		id: layerspercategory.other.labelstops,
		type: 'symbol',
		source: 'otherstops',
		'source-layer': 'data',
		layout: {
			'text-field': ['get', 'displayname'],
			'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
			'text-size': ['interpolate', ['linear'], ['zoom'], 9, 6, 15, 9, 17, 10],
			'text-radial-offset': 1,
			//'text-ignore-placement': true,
			//'icon-ignore-placement': false,
			//'text-allow-overlap': true,
			//'symbol-avoid-edges': false,
			'text-font': ['literal', ['Barlow-Bold']]
		},
		paint: {
			'text-color': darkMode ? '#eee6fe' : '#2a2a2a',
			'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
			'text-halo-width': 1,
			//'text-emissive-strength': 1
		},
		filter: ['all', ['any', ['>', ['zoom'], 16], ['==', null, ['get', 'parent_station']]]],
		minzoom: 9
	});
}
