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
import { start_location_watch } from '../user_location_lib';

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
	map.on('load', async () => {
		recompute_map_padding();
		clearbottomright();
		start_location_watch();
		// Add new sources and layers
		

		if (localStorage.getItem('showzombiebuses') === 'true') {
			show_zombie_buses_store.set(true);
			runSettingsAdapt();
		}

		map.addSource('chateaus', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		if (get(chateaus_store) !== null) {
			map.getSource('chateaus').setData(get(chateaus_store));
		}

		map.addLayer({
			id: 'chateaus_calc',
			type: 'fill',
			source: 'chateaus',
			paint: {
				'fill-color': '#ffffff',
				'fill-opacity': 0
			}
		});

		addGeoRadius(map);
		makeGpsLayer(map);

		map.addSource('intercityrailshapes', {
			type: 'vector',
			url: 'https://birch1.catenarymaps.org/shapes_intercity_rail'
		});

		map.addSource('localcityrailshapes', {
			type: 'vector',
			url: 'https://birch2.catenarymaps.org/shapes_local_rail'
		});

		map.addSource('othershapes', {
			type: 'vector',
			url: 'https://birch3.catenarymaps.org/shapes_ferry'
		});

		map.addSource('busshapes', {
			type: 'vector',
			url: 'https://birch4.catenarymaps.org/shapes_bus'
		});

		map.addSource('busstops', {
			type: 'vector',
			url: 'https://birch6.catenarymaps.org/busstops'
		});

		map.addSource('stationfeatures', {
			type: 'vector',
			url: 'https://birch7.catenarymaps.org/station_features'
		});

		map.addSource('railstops', {
			type: 'vector',
			url: 'https://birch5.catenarymaps.org/railstops'
		});

		map.addSource('otherstops', {
			type: 'vector',
			url: 'https://birch8.catenarymaps.org/otherstops'
		});

		makeFireMap(map, chateaus_in_frame);

		addShapes(map, darkMode, layerspercategory);

		addStopsLayers(map, darkMode, layerspercategory);

		map.loadImage('/station-enter.png').then((image) => {
			map.addImage('station-enter', image.data);

			map.addLayer(
				{
					id: 'stationenter',
					type: 'symbol',
					source: 'stationfeatures',
					filter: ['all', ['==', 2, ['get', 'location_type']]],
					'source-layer': 'data',
					paint: {
						//'symbol-emissive-strength': 1
					},
					layout: {
						'icon-image': 'station-enter',
						'icon-size': ['interpolate', ['linear'], ['zoom'], 14, 0.2, 15, 0.2, 16, 0.25, 18, 0.4],
						'icon-ignore-placement': false,
						'icon-allow-overlap': true
					},

					minzoom: window?.innerWidth >= 1023 ? 14 : 15
				},
				layerspercategory.bus.stops
			);

			map.addLayer(
				{
					id: 'stationenterlabel',
					filter: ['all', ['==', 2, ['get', 'location_type']]],
					type: 'symbol',
					source: 'stationfeatures',
					'source-layer': 'data',

					layout: {
						'text-field': ['get', 'name'],
						'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
						'text-size': ['interpolate', ['linear'], ['zoom'], 15, 5, 17, 8, 19, 9.5],
						'text-radial-offset': 1,
						'text-ignore-placement': false,
						//'icon-ignore-placement': false,
						'text-allow-overlap': true,
						//'symbol-avoid-edges': false,
						'text-font': ['Barlow Bold']
					},
					paint: {
						'text-color': darkMode ? '#bae6fd' : '#1d4ed8',
						'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
						'text-halo-width': darkMode ? 0.4 : 0.2,
						//'text-emissive-strength': 1
					},
					minzoom: window?.innerWidth >= 1023 ? 17.5 : 17
				},
				layerspercategory.bus.stops
			);
		});

		map.addSource('buses', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addSource('localrail', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addSource('intercityrail', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addSource('other', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		make_custom_icon_source(map);
		add_bunny_layer(map, layerspercategory);

		makeContextLayerDataset(map);

		makeCircleLayers(map, darkMode, layerspercategory);
		console.log('making bearing arrow pointers');
		makeBearingArrowPointers(map, darkMode, layerspercategory);

		runSettingsAdapt();

		map.addSource('user_geolocation', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [0, 0]
						},
						properties: {}
					}
				]
			}
		});

		map.addSource('userpositionacc', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'userpositionacclayer',
			type: 'fill',
			source: 'userpositionacc',
			paint: {
				'fill-color': '#38bdf8',
				'fill-opacity': ['get', 'opacity'],
				//'fill-emissive-strength': 1
			}
		});

		runSettingsAdapt();

		map.loadImage('/geo-circle.png')
			.then((image) => {
				map.addImage('geocircle', image.data);

				map.addLayer({
					id: 'nobearing_position',
					type: 'symbol',
					source: 'user_geolocation', // reference the data source
					layout: {
						'icon-image': 'geocircle', // reference the image
						'icon-size': 0.1,
						visibility: 'none',
						'icon-allow-overlap': true,
						'icon-ignore-placement': true,
						'text-allow-overlap': true,
						'text-ignore-placement': true
					},
					paint: {
						'icon-opacity': 0.8,
						//'icon-emissive-strength': 1
					}
				});
			})
			.catch((error) => {
				console.error(error);
			});
	

		const geo_nav = await map.loadImage('/geo-nav.png');

		map.addImage('geonav', geo_nav.data);

		map.addLayer({
			id: 'bearing_position',
			type: 'symbol',
			source: 'user_geolocation', // reference the data source
			layout: {
				'icon-image': 'geonav', // reference the image
				'icon-size': 0.13,
				'icon-rotate': ['get', 'heading'],
				visibility: 'none'
			},
			paint: {
				'icon-opacity': 0.8,
				//'icon-emissive-strength': 1
			}
		});

		const chateau_feed_results = determineFeedsUsingChateaus(map);
		chateaus_in_frame.set(Array.from(chateau_feed_results.chateaus));

		setInterval(() => {
			//const chateau_feed_results = determineFeedsUsingChateaus(map);
			//chateaus_in_frame.set(Array.from(chateau_feed_results.chateaus));
			console.log('fetching realtime locations now');
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

		setTimeout(() => {
			recompute_map_padding();
			runSettingsAdapt();
		}, 1);
	});
}
