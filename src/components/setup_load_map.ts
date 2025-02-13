import { get, writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { makeFireMap } from './wildfireMap';
import maplibregl from 'maplibre-gl';
import {
	realtime_vehicle_locations_last_updated_store,
	realtime_vehicle_locations_store,
	realtime_vehicle_route_cache_hash_store,
	realtime_vehicle_route_cache_store,
	show_zombie_buses_store,
	chateaus_store
} from '../globalstores';
import { clearbottomright } from './clearbottomright';
import { determineFeedsUsingChateaus } from '../maploaddata';
import { addStopsLayers } from './addLayers/addStops';
import { garbageCollectNotInView } from './garbage_collect';
import { addGeoRadius, setUserCircles } from './userradius';
import { addShapes } from './addLayers/addShapes';
import { fetch_realtime_vehicle_locations } from './fetch_realtime_vehicle_locations';
import { add_bunny_layer, make_custom_icon_source, new_jeans_buses } from './addLayers/customIcons';
import { makeCircleLayers } from './addLayers/addLiveDots';
import { makeBearingArrowPointers } from './addLayers/makebearingarrowpointers';
import { makeGpsLayer } from './makeGpsLayer';
import { makeContextLayerDataset } from './addLayers/contextLayer';
import { start_location_watch, update_geolocation_source } from '../user_location_lib';

const RASTER_SOURCES = [
	{ id: 'foamertiles', url: 'standard' },
	{ id: 'maxspeedtiles', url: 'maxspeed' },
	{ id: 'signallingtiles', url: 'signals' },
	{ id: 'electrificationtiles', url: 'electrification' },
	{ id: 'gaugetiles', url: 'gauge' }
];

const RAIL_SHAPES = [
	{ id: 'intercityrailshapes', url: 'https://birch1.catenarymaps.org/shapes_intercity_rail' },
	{ id: 'localcityrailshapes', url: 'https://birch2.catenarymaps.org/shapes_local_rail' },
	{ id: 'othershapes', url: 'https://birch3.catenarymaps.org/shapes_ferry' },
	{ id: 'busshapes', url: 'https://birch4.catenarymaps.org/shapes_bus' }
];

const STOP_SOURCES = [
	{ id: 'busstops', url: 'https://birch6.catenarymaps.org/busstops' },
	{ id: 'stationfeatures', url: 'https://birch7.catenarymaps.org/station_features' },
	{ id: 'railstops', url: 'https://birch5.catenarymaps.org/railstops' },
	{ id: 'otherstops', url: 'https://birch8.catenarymaps.org/otherstops' }
];

export async function setup_load_map(
	map: maplibregl.Map,
	runSettingsAdapt: () => void,
	darkMode: boolean,
	layerspercategory: Record<string, any>,
	chateaus_in_frame: Writable<string[]>,
	layersettings: Record<string, any>,
	chateau_to_realtime_feed_lookup: Record<string, any>,
	pending_chateau_rt_request: Record<string, number>,
	recompute_map_padding: () => void
) {
	let updateInterval: NodeJS.Timeout;
	const minZoomThreshold = window.innerWidth >= 1023 ? 14 : 15;

	map.on('load', async () => {

		recompute_map_padding();
		clearbottomright();

		const emptyGeoJSON = { type: 'FeatureCollection', features: [] };

		[addGeoRadius, makeGpsLayer].forEach(fn => fn(map));
		update_geolocation_source();

		if (localStorage.getItem('showzombiebuses') === 'true') {
			show_zombie_buses_store.set(true);
			runSettingsAdapt();
		}

		const chateauData = get(chateaus_store);
		map.addSource('chateaus', { type: 'geojson', data: chateauData || emptyGeoJSON });

		[...RAIL_SHAPES, ...STOP_SOURCES].forEach(({ id, url }) => {
			map.addSource(id, { type: 'vector', url });
		});

		RASTER_SOURCES.forEach(({ id, url }) => {
			map.addSource(id, {
				type: 'raster',
				tiles: [`https://{a-c}.tiles.openrailwaymap.org/${url}/{z}/{x}/{y}.png`],
				tileSize: 256
			});
		});

		makeFireMap(map, chateaus_in_frame);
		addShapes(map, darkMode, layerspercategory);
		addStopsLayers(map, darkMode, layerspercategory);
		makeContextLayerDataset(map);
		makeCircleLayers(map, darkMode, layerspercategory);
		makeBearingArrowPointers(map, darkMode, layerspercategory);

		const [stationImage, geoNavImage] = await Promise.all([
			map.loadImage('/station-enter.png'),
			map.loadImage('/geo-nav.png')
		]);

		if (stationImage) {
			map.addImage('station-enter', stationImage.data);
			addStationLayers(map, layerspercategory, darkMode, minZoomThreshold);
		}

		if (geoNavImage) {
			map.addImage('geonav', geoNavImage.data);
			addGeolocationLayers(map);
		}

		const initialChateauData = determineFeedsUsingChateaus(map);
		chateaus_in_frame.set(Array.from(initialChateauData.chateaus));

		updateInterval = setInterval(() => {
			fetch_realtime_vehicle_locations(
				layersettings,
				chateaus_in_frame,
				chateau_to_realtime_feed_lookup,
				pending_chateau_rt_request,
				map
			);
			garbageCollectNotInView(chateaus_in_frame);
		}, 1000);

		fetch_realtime_vehicle_locations(
			layersettings,
			chateaus_in_frame,
			chateau_to_realtime_feed_lookup,
			pending_chateau_rt_request,
			map
		);

		recompute_map_padding();
		runSettingsAdapt();
	});

	map.on('remove', () => {
		clearInterval(updateInterval);
		RASTER_SOURCES.forEach(({ id }) => map.removeSource(id));
		RAIL_SHAPES.forEach(({ id }) => map.removeSource(id));
		STOP_SOURCES.forEach(({ id }) => map.removeSource(id));
	});
}

function addStationLayers(map: maplibregl.Map, layerspercategory: any, darkMode: boolean, minZoom: number) {
	map.addLayer({
		id: 'stationenter',
		type: 'symbol',
		source: 'stationfeatures',
		filter: ['all', ['==', 2, ['get', 'location_type']]],
		'source-layer': 'data',
		layout: {
			'icon-image': 'station-enter',
			'icon-size': ['interpolate', ['linear'], ['zoom'], 14, 0.2, 15, 0.2, 16, 0.25, 18, 0.4],
			'icon-ignore-placement': false,
			'icon-allow-overlap': true,
			minzoom: minZoom
		}
	}, layerspercategory.bus.stops);

	map.addLayer({
		id: 'stationenterlabel',
		type: 'symbol',
		source: 'stationfeatures',
		filter: ['all', ['==', 2, ['get', 'location_type']]],
		'source-layer': 'data',
		layout: {
			'text-field': ['get', 'name'],
			'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
			'text-size': ['interpolate', ['linear'], ['zoom'], 15, 5, 17, 8, 19, 9.5],
			'text-radial-offset': 1,
			'text-allow-overlap': true,
			'text-font': ['Barlow-Bold'],
			minzoom: window.innerWidth >= 1023 ? 17.5 : 17
		},
		paint: {
			'text-color': darkMode ? '#bae6fd' : '#1d4ed8',
			'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
			'text-halo-width': darkMode ? 0.4 : 0.2
		}
	}, layerspercategory.bus.stops);
}

function addGeolocationLayers(map: maplibregl.Map) {
	map.addSource('user_geolocation', {
		type: 'geojson',
		data: { type: 'FeatureCollection', features: [{
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [0, 0] },
			properties: {}
		}]}
	});

	map.addLayer({
		id: 'bearing_position',
		type: 'symbol',
		source: 'user_geolocation',
		layout: {
			'icon-image': 'geonav',
			'icon-size': 0.13,
			'icon-rotate': ['get', 'heading'],
			visibility: 'none'
		},
		paint: { 'icon-opacity': 0.8 }
	});
}
