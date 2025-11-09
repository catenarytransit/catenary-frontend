import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import { get } from 'svelte/store';
import { process_realtime_vehicle_locations_v2 } from './process_realtime_data';

import {
	realtime_vehicle_locations_store,
	realtime_vehicle_route_cache_store,
	realtime_vehicle_route_cache_hash_store,
	realtime_vehicle_locations_last_updated_store,
	previous_tile_boundaries_store
} from '../globalstores';

import jsonwebworkerpkg from '@cheprasov/json-web-worker';
const { jsonWebWorker, parse, stringify } = jsonwebworkerpkg;

let store_of_pending_requests: Writable<Record<string, number>> = writable({});

export function fetch_realtime_vehicle_locations(
	layersettings: Record<string, any>,
	chateaus_in_frame: Writable<string[]>,
	chateau_to_realtime_feed_lookup: Record<string, any>,
	pending_chateau_rt_request: Record<string, number>,
	map: maplibregl.Map
) {
	const categories_to_request: string[] = [];

	let shortest_screen_width = Math.min(window.screen.width, window.screen.height);

	let bus_threshold = shortest_screen_width < 768 ? 7.5 : 6.5;

	let zoom = Math.round(map.getZoom());

	if (layersettings.bus.visible) {
		if (zoom >= bus_threshold) {
			categories_to_request.push('bus');
		}
	}

	if (zoom >= 3) {
		if (layersettings.intercityrail.visible) {
			categories_to_request.push('rail');
		}
	}

	if (zoom >= 4) {
		if (layersettings.localrail.visible) {
			categories_to_request.push('metro');
		}
	}

	if (zoom >= 3) {
		if (layersettings.other.visible) {
			categories_to_request.push('other');
		}
	}

	const realtime_chateaus_in_frame = get(chateaus_in_frame).filter((chateau_id: string) => {
		return chateau_to_realtime_feed_lookup[chateau_id].length > 0;
	});

	//console.log('realtime chateaus in frame', realtime_chateaus_in_frame);

	//console.log('realtime_chateaus_in_frame', realtime_chateaus_in_frame);

	let chateaus_to_fetch: Record<string, Record<string, any>> = {};


		
			const previous_tile_boundaries = get(previous_tile_boundaries_store);
	const bounds = bounds_input_calculate(map);

	get(chateaus_in_frame).forEach((chateauId) => {
		const realtime_vehicle_locations_last_updated = get(
			realtime_vehicle_locations_last_updated_store
		);

		let this_chateau_last_updated = realtime_vehicle_locations_last_updated[chateauId];

		let category_params = {};

		['bus', 'rail', 'metro', 'other'].forEach((category) => {
			let last_updated = 0;
			if (this_chateau_last_updated && this_chateau_last_updated[category]) {
				last_updated = this_chateau_last_updated[category];
			}
			category_params[category] = {
				last_updated_time_ms: last_updated
			};

			//fetch from previous_tile_boundaries_store[chateau][category]
			if (previous_tile_boundaries[chateauId]  ) {
				if (previous_tile_boundaries[chateauId][category]) {
					
				category_params[category].prev_user_min_x = previous_tile_boundaries[chateauId][category].min_x;
				category_params[category].prev_user_max_x = previous_tile_boundaries[chateauId][category].max_x;
				category_params[category].prev_user_min_y = previous_tile_boundaries[chateauId][category].min_y;
				category_params[category].prev_user_max_y = previous_tile_boundaries[chateauId][category].max_y;
				}
			}
		});

		chateaus_to_fetch[chateauId] = {
			category_params: category_params
		}
	});

	let raw = JSON.stringify({
		"categories": categories_to_request,
		chateaus: chateaus_to_fetch,
		bounds_input: bounds
	});

	const myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/json");

	const requestOptions = {
		method: "POST",
		headers: myHeaders,
		body: raw,
		redirect: "follow",
		mode: 'cors'
	};

	if (categories_to_request.length > 0) {
		fetch("https://birch_rt.catenarymaps.org/bulk_realtime_fetch_v2", requestOptions)
			.then((response) => response.text())
			.then((text) => jsonWebWorker.parse(text))
			.then((result) => {
				process_realtime_vehicle_locations_v2(result, map, bounds);
			})
			.catch((error) => console.log('error', error));
	}

}

export function bounds_input_calculate(map: maplibregl.Map) {
	const levels = [5, 7, 8, 10];
	const bounds_input: Record<string, any> = {};

	for (const zoom of levels) {
		const boundaries = get_tile_boundaries(map, zoom);
		const maxTiles = Math.pow(2, zoom) - 1;  // Maximum tile index for this zoom level

		let padding = 2;

		if (map.getZoom() > 10) {
			padding = 0;
		}

		bounds_input[`level${zoom}`] = {
			min_x: Math.max(0, boundaries.west - padding),
			max_x: Math.min(maxTiles, boundaries.east + padding),
			min_y: Math.max(0, boundaries.north - padding),
			max_y: Math.min(maxTiles, boundaries.south + padding)
		};
	}

	return bounds_input;
}


export function get_tile_boundaries(map: maplibregl.Map, zoom: number) {
    const bounds = map.getBounds();
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    const n = Math.pow(2, zoom);

    const lat_rad_north = north * Math.PI / 180;
    const lat_rad_south = south * Math.PI / 180;

    const xtile_west = Math.floor((west + 180) / 360 * n);
    const xtile_east = Math.floor((east + 180) / 360 * n);

    const ytile_north = Math.floor((1 - Math.log(Math.tan(lat_rad_north) + 1 / Math.cos(lat_rad_north)) / Math.PI) / 2 * n);
    const ytile_south = Math.floor((1 - Math.log(Math.tan(lat_rad_south) + 1 / Math.cos(lat_rad_south)) / Math.PI) / 2 * n);

    return {
        north: ytile_north,
        south: ytile_south,
        east: xtile_east,
        west: xtile_west
    };
}

