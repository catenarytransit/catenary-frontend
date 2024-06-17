import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import mapboxgl from 'mapbox-gl';
import {
	what_kactus_to_use,
	what_martin_to_use,
	what_backend_to_use,
	check_kactus,
	check_backend
} from './distributed';
import {
	realtime_vehicle_locations_last_updated_store,
	realtime_vehicle_locations_store,
	realtime_vehicle_route_cache_hash_store,
	realtime_vehicle_route_cache_store,
	show_zombie_buses_store
} from '../globalstores';
import { clearbottomright } from './clearbottomright';
import { determineFeedsUsingChateaus } from '../maploaddata';
import { addStopsLayers, changeRailTextOutsideNorthAmerica } from './addLayers/addStops';
import { garbageCollectNotInView } from './garbage_collect';
import { addGeoRadius, setUserCircles } from './userradius';
import { addShapes } from './addLayers/addShapes';
import { fetch_realtime_vehicle_locations } from './fetch_realtime_vehicle_locations';
import {
	add_bunny_layer,
	make_custom_icon_source,
	new_jeans_buses
} from './addLayers/customIcons';
import { makeCircleLayers } from './addLayers/addLiveDots';
import { makeBearingArrowPointers } from './addLayers/makebearingarrowpointers';
import {makeGpsLayer} from './makeGpsLayer';

export function setup_load_map(
	map: mapboxgl.Map,
	runSettingsAdapt: () => void,
	darkMode: boolean,
	layerspercategory: Record<string, any>,
	chateaus_in_frame: Writable<string[]>,
	layersettings: Record<string, any>,
	chateau_to_realtime_feed_lookup: Record<string, any>,
	pending_chateau_rt_request: Record<string, number>,
	recompute_map_padding: () => void
) {
	map.on('load', () => {
		recompute_map_padding();
		clearbottomright();
		// Add new sources and layers
		const removelogo1 = document.getElementsByClassName('mapboxgl-ctrl-logo');

		if (removelogo1) {
			removelogo1[0].remove();
		}

		if (localStorage.getItem('showzombiebuses') === 'true') {
			show_zombie_buses_store.set(true);
			runSettingsAdapt();
		}

			//fire section
			map.addSource('arcgisfire', {
				type: 'geojson',
				//data: "https://stg-arcgisazurecdataprod3.az.arcgis.com/exportfiles-2532-201269/IMSR_Incident_Locations_Most_Recent_View_-7922161599661102971.geojson?sv=2018-03-28&sr=b&sig=iNCmDjs038sig3DJ7jyIM6imAabZl3OH2AITGiWUOVw%3D&se=2024-06-17T04%3A49%3A30Z&sp=r"
				data: "https://stg-arcgisazurecdataprod3.az.arcgis.com/exportfiles-2532-182272/WFIGS_Interagency_Perimeters_Current_-6544343811762491332.geojson?sv=2018-03-28&sr=b&sig=0Qpq7JG2NWRKLZnEynN%2BgcGPt41fWRNZvWGnaO8%2BZao%3D&se=2024-06-17T04%3A55%3A59Z&sp=r"
			});
	
			map.addLayer({
				source: "arcgisfire",
				id: 'arcgisfire',
				type: "fill",
				filter: [
					'all',
					['!=', ['get', "attr_FireBehaviorGeneral"], null],
					['!=', ['get', "attr_FireBehaviorGeneral"], "Minimal"]
				],	
				paint: {
					"fill-color": "#dd3300",
					"fill-opacity": 0.2,
				},
				minzoom: 5
			});

			map.addLayer({
				source: "arcgisfire",
				id: 'arcgisfireborder',
				filter: [
					'all',
					['!=', ['get', "attr_FireBehaviorGeneral"], null],
					['!=', ['get', "attr_FireBehaviorGeneral"], "Minimal"]
				],
				type: "line",
				paint: {
					"line-color": "#ee0000",
					"line-width": 3
				},
				minzoom: 5
			});

			/*		map.addSource('arcgisfirepoint', {
				type: 'geojson',
				data: "https://stg-arcgisazurecdataprod3.az.arcgis.com/exportfiles-2532-201269/IMSR_Incident_Locations_Most_Recent_View_-7922161599661102971.geojson?sv=2018-03-28&sr=b&sig=iNCmDjs038sig3DJ7jyIM6imAabZl3OH2AITGiWUOVw%3D&se=2024-06-17T04%3A49%3A30Z&sp=r"
				//data: "https://stg-arcgisazurecdataprod3.az.arcgis.com/exportfiles-2532-182272/WFIGS_Interagency_Perimeters_Current_-6544343811762491332.geojson?sv=2018-03-28&sr=b&sig=0Qpq7JG2NWRKLZnEynN%2BgcGPt41fWRNZvWGnaO8%2BZao%3D&se=2024-06-17T04%3A55%3A59Z&sp=r"
			});
			*/
	
			map.addLayer({
				source: "arcgisfire",
				id: 'arcgisfirepoint',
				type: "symbol",
				filter: [
					'all',
					['!=', ['get', "attr_FireBehaviorGeneral"], null],
					['!=', ['get', "attr_FireBehaviorGeneral"], "Minimal"]
				],
				paint: {
					"text-color":  darkMode? "#ffaaaa" : "#aa0000",
				},
				layout: {
					"text-field": ['concat', ['get', 'attr_IncidentName'], " FIRE"],
					'text-size': 10,
					'text-font': ['Barlow Medium', 'Arial Unicode MS Bold'],
				},
				minzoom: 5
			});

		map.addSource('chateaus', {
			type: 'geojson',
			data: 'https://birch.catenarymaps.org/getchateaus'
		});

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

		map.addSource('notbusshapes', {
			type: 'vector',
			url: 'https://birch.catenarymaps.org/shapes_not_bus'
		});

		map.addSource('busshapes', {
			type: 'vector',
			url: 'https://birch.catenarymaps.org/shapes_bus'
		});

		map.addSource('busstops', {
			type: 'vector',
			url: 'https://birch.catenarymaps.org/busstops'
		});

		map.addSource('stationfeatures', {
			type: 'vector',
			url: 'https://birch.catenarymaps.org/station_features'
		});

		map.addSource('railstops', {
			type: 'vector',
			url: 'https://birch.catenarymaps.org/railstops'
		});

		map.addSource('otherstops', {
			type: 'vector',
			url: 'https://birch.catenarymaps.org/otherstops'
		});

		map.addSource('foamertiles', {
			type: 'raster',
			tiles: ['https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'],
			tileSize: 256
		});

		map.addSource('maxspeedtiles', {
			type: 'raster',
			tiles: ['https://a.tiles.openrailwaymap.org/maxspeed/{z}/{x}/{y}.png'],
			tileSize: 256
		});

		map.addSource('signallingtiles', {
			type: 'raster',
			tiles: ['https://a.tiles.openrailwaymap.org/signals/{z}/{x}/{y}.png'],
			tileSize: 256
		});

		map.addSource('electrificationtiles', {
			type: 'raster',
			tiles: ['https://a.tiles.openrailwaymap.org/electrification/{z}/{x}/{y}.png'],
			tileSize: 256
		});

		map.addSource('gaugetiles', {
			type: 'raster',
			tiles: ['https://a.tiles.openrailwaymap.org/gauge/{z}/{x}/{y}.png'],
			tileSize: 256
		});

		map.addLayer({
			id: 'foamershapes',
			type: 'raster',
			source: 'foamertiles',
			layout: {
				'visibility': 'none'
			},
			paint: {
				'raster-emissive-strength': 0.8,
			}
		});

		map.addLayer({
			id: 'maxspeedshapes',
			type: 'raster',
			source: 'maxspeedtiles',
			layout: {
				'visibility': 'none'
			},
			paint: {
				'raster-emissive-strength': 0.8,
			}
		});

		map.addLayer({
			id: 'signallingshapes',
			type: 'raster',
			source: 'signallingtiles',
			layout: {
				'visibility': 'none'
			},
			paint: {
				'raster-emissive-strength': 0.8,
			}
		});

		map.addLayer({
			id: 'electrificationshapes',
			type: 'raster',
			source: 'electrificationtiles',
			layout: {
				'visibility': 'none'
			},
			paint: {
				'raster-emissive-strength': 0.8,
			}
		});

		map.addLayer({
			id: 'gaugeshapes',
			type: 'raster',
			source: 'gaugetiles',
			layout: {
				'visibility': 'none'
			},
			paint: {
				'raster-emissive-strength': 0.8,
			}
		});

		map.addLayer({
			id: 'ferryshapes',
			type: 'line',
			source: 'notbusshapes',
			'source-layer': 'data',
			filter: ['all', ['==', 4, ['get', 'route_type']]],
			paint: {
				'line-dasharray': [1, 2],
				'line-color': ['concat', '#', ['get', 'color']],
				'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 14, 3],
				'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 7, 0.9],
				'line-emissive-strength': 1
				
			},
			minzoom: 3
		});

		addShapes(map, darkMode, layerspercategory);

		addStopsLayers(map, darkMode, layerspercategory);

		map.loadImage('/station-enter.png', (error, image) => {
			if (error) throw error;

			map.addImage('station-enter', image);

			map.addLayer(
				{
					id: 'stationenter',
					type: 'symbol',
					source: 'stationfeatures',
					filter: ['all', ['==', 2, ['get', 'location_type']]],
					'source-layer': 'data',
					paint: {
						'symbol-emissive-strength': 1
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
						'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular']
					},
					paint: {
						'text-color': darkMode ? '#bae6fd' : '#1d4ed8',
						'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
						'text-halo-width': darkMode ? 0.4 : 0.2,
						'text-emissive-strength': 1
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
		makeCircleLayers(map, darkMode, layerspercategory);
		makeBearingArrowPointers(map, darkMode, layerspercategory);

		runSettingsAdapt();

		map.addSource('geolocation', {
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
				'fill-emissive-strength': 1
			}
		});

		runSettingsAdapt();

		map.loadImage('/geo-circle.png', (error, image) => {
			if (error) throw error;

			// Add the image to the map style.
			map.addImage('geocircle', image);

			map.addLayer({
				id: 'nobearing_position',
				type: 'symbol',
				source: 'geolocation', // reference the data source
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
					'icon-emissive-strength': 1
				}
			});
		});

		map.loadImage('/geo-nav.png', (error, image) => {
			if (error) throw error;
			// Add the image to the map style.
			map.addImage('geonav', image);

			map.addLayer({
				id: 'bearing_position',
				type: 'symbol',
				source: 'geolocation', // reference the data source
				layout: {
					'icon-image': 'geonav', // reference the image
					'icon-size': 0.13,
					'icon-rotate': ['get', 'heading'],
					visibility: 'none'
				},
				paint: {
					'icon-opacity': 0.8,
					'icon-emissive-strength': 1
				}
			});
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

		makeGpsLayer(map);

		recompute_map_padding();
		
		changeRailTextOutsideNorthAmerica(map, layerspercategory);

		runSettingsAdapt();

		setTimeout(() => {
			recompute_map_padding()
		}, 1);
	});
}
