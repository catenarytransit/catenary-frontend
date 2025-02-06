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

const subdomains = [
	"https://birch_rt1.catenarymaps.org",
];

export function fetch_realtime_vehicle_locations(
	layersettings: Record<string, any>,
	chateaus_in_frame: Writable<string[]>,
	chateau_to_realtime_feed_lookup: Record<string, any>,
	pending_chateau_rt_request: Record<string, number>,
	map: maplibregl.Map
) {
	const categories_to_request: string[] = [];

	if (layersettings.bus.visible) {
		categories_to_request.push('bus');
	}

	if (layersettings.intercityrail.visible) {
		categories_to_request.push('rail');
	}

	if (layersettings.localrail.visible) {
		categories_to_request.push('metro');
	}

	if (layersettings.other.visible) {
		categories_to_request.push('other');
	}

	const realtime_chateaus_in_frame = get(chateaus_in_frame).filter((chateau_id: string) => {
		return chateau_to_realtime_feed_lookup[chateau_id].length > 0;
	});

	console.log('realtime chateaus in frame', realtime_chateaus_in_frame);

	//console.log('realtime_chateaus_in_frame', realtime_chateaus_in_frame);

	let chateaus_to_fetch: Record<string, Record<string, any>> = {};

	get(chateaus_in_frame).forEach((chateauId) => {
		const realtime_vehicle_locations_last_updated = get(
			realtime_vehicle_locations_last_updated_store
		);
		const realtime_vehicle_route_cache_hash = get(realtime_vehicle_route_cache_hash_store);

		let this_chateau_last_updated = realtime_vehicle_locations_last_updated[chateauId] || 0;
		let this_chateau_route_cache_hash = realtime_vehicle_route_cache_hash[chateauId] || 0;

		chateaus_to_fetch[chateauId] = {
			"last_updated_time_ms": this_chateau_last_updated,
            "existing_fasthash_of_routes": this_chateau_route_cache_hash
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
		fetch("https://birch.catenarymaps.org/bulk_realtime_fetch_v1", requestOptions)
		.then((response) => response.json())
		.then((result) => {
			process_realtime_vehicle_locations_v2(result, map);
		});
	  }
	  
}
