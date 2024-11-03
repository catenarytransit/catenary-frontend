import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import { get } from 'svelte/store';
import { process_realtime_vehicle_locations } from './process_realtime_data';

import {
	realtime_vehicle_locations_store,
	realtime_vehicle_route_cache_store,
	realtime_vehicle_route_cache_hash_store,
	realtime_vehicle_locations_last_updated_store
} from '../globalstores';

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

	get(chateaus_in_frame).forEach((chateauId) => {
		categories_to_request.forEach((category) => {
			const pending_key = `${chateauId}-${category}`;

			let last_updated_time_ms: number = 0;

			const realtime_vehicle_locations_last_updated = get(
				realtime_vehicle_locations_last_updated_store
			);
			const realtime_vehicle_route_cache_hash = get(realtime_vehicle_route_cache_hash_store);
			const realtime_vehicle_route_cache = get(realtime_vehicle_route_cache_store);

			if (realtime_vehicle_locations_last_updated[chateauId]) {
				if (realtime_vehicle_locations_last_updated[chateauId][category]) {
					last_updated_time_ms = realtime_vehicle_locations_last_updated[chateauId][category];
				}
			}
			let existing_fasthash: number = 0;
			if (realtime_vehicle_route_cache_hash[chateauId]) {
				if (realtime_vehicle_route_cache[chateauId]) {
					existing_fasthash = realtime_vehicle_route_cache_hash[chateauId][category] || 0;
				}
			}

			const url = `https://birch.catenarymaps.org/get_realtime_locations/${chateauId}/${category}/${last_updated_time_ms}/${existing_fasthash}`;

			if (chateau_to_realtime_feed_lookup[chateauId]) {
				const pending_chateau_rt_request_for_chateau = pending_chateau_rt_request[pending_key];

				let allowed_to_fetch = true;

				if (pending_chateau_rt_request[pending_key] != undefined) {
					if (Date.now() - pending_chateau_rt_request_for_chateau < 20000) {
						/*allowed_to_fetch = false;
								console.log(
									'blocking',
									pending_key,
									', fetch in progress',
									Date.now() - pending_chateau_rt_request_for_chateau
								);*/
					}
				}

				if (map.getZoom() < 4) {
					allowed_to_fetch = false;
				}

				if (map.getZoom() < 8.2 && category == 'bus') {
					allowed_to_fetch = false;
				}

				if (map.getZoom() < 5 && category == 'metro') {
					allowed_to_fetch = false;
				}

				pending_chateau_rt_request[pending_key] = Date.now();

				if (allowed_to_fetch == true) {
					fetch(url)
						.then(async (response) => {
							delete pending_chateau_rt_request[pending_key];
							try {
								//if response is 200
								if (response.status == 200) {
									const response_from_birch_vehicles_text = await response.text();

									const no_data_answer = 'No assigned node found for this chateau';

									if (
										response_from_birch_vehicles_text != no_data_answer &&
										response_from_birch_vehicles_text != 'No realtime data found for this chateau'
									) {
										const response_from_birch_vehicles = JSON.parse(
											response_from_birch_vehicles_text
										);
										//console.log('processing now', chateauId, category);
										process_realtime_vehicle_locations(
											chateauId,
											category,
											response_from_birch_vehicles,
											map
										);
									}
								}
							} catch (e) {
								//console.error(chateauId, category, e);
								//return false;
							}
						})
						.catch((err: any) => {
							delete pending_chateau_rt_request[pending_key];
						});
				} else {
					//console.log('not allowed to fetch', chateauId, category);
				}
			}
		});
	});
}
