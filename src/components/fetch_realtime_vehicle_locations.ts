import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import { get } from 'svelte/store';
import { process_realtime_vehicle_locations_v2 } from './process_realtime_data';

import {
	realtime_vehicle_locations_store,
	realtime_vehicle_route_cache_store,
	realtime_vehicle_route_cache_hash_store,
	realtime_vehicle_locations_last_updated_store
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

	let zoom = map.getZoom();

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

	get(chateaus_in_frame).forEach((chateauId) => {
		const realtime_vehicle_locations_last_updated = get(
			realtime_vehicle_locations_last_updated_store
		);
		const realtime_vehicle_route_cache_hash = get(realtime_vehicle_route_cache_hash_store);

		let this_chateau_last_updated = realtime_vehicle_locations_last_updated[chateauId];
		let this_chateau_route_cache_hash = realtime_vehicle_route_cache_hash[chateauId];

		let category_params = {

		};

		['bus', 'rail', 'metro', 'other'].forEach((category) => {
			if (typeof category_params[category] === 'undefined') {
				category_params[category] = {
					hash_of_routes: 0,
					last_updated_time_ms: 0
				};
			}
		});

		if (this_chateau_last_updated) {
			['bus', 'rail', 'metro', 'other'].forEach((category) => {
				if (this_chateau_last_updated[category]) {
					category_params[category].last_updated_time_ms = this_chateau_last_updated[category];
				}
			});
		}

		if (this_chateau_route_cache_hash) {
			['bus', 'rail', 'metro', 'other'].forEach((category) => {
				if (this_chateau_route_cache_hash[category]) {
					category_params[category].hash_of_routes = this_chateau_route_cache_hash[category];
				}
			});
		}

		chateaus_to_fetch[chateauId] = {
			category_params: category_params
		}
	});

	let raw = JSON.stringify({
		"categories": categories_to_request,
		chateaus: chateaus_to_fetch
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
		fetch("https://birch_rt.catenarymaps.org/bulk_realtime_fetch_v1", requestOptions)
			.then((response) => response.text())
			.then((text) => jsonWebWorker.parse(text))
			.then((result) => {
				process_realtime_vehicle_locations_v2(result, map);
			})
			.catch((error) => console.log('error', error));
	}

}
