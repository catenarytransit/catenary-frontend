import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import { get } from 'svelte/store';

import { createGeoJSONCircle, componentToHex } from '../geoMathsAssist';

import {
	realtime_vehicle_locations_store,
	realtime_vehicle_route_cache_store,
	realtime_vehicle_route_cache_hash_store,
	realtime_vehicle_locations_last_updated_store,
	route_cache,
	route_cache_agencies_known
} from '../globalstores';

export function garbageCollectNotInView(chateaus_in_frame: Writable<string[]>) {
	//chateaus_in_frame

	const chateaus_in_frame_set = new Set(get(chateaus_in_frame));

	realtime_vehicle_locations_store.update((realtime_vehicle_locations) => {
		Object.values(realtime_vehicle_locations).forEach((category) => {
			Object.keys(category).forEach((chateau_id) => {
				if (!chateaus_in_frame_set.has(chateau_id)) {
					delete category[chateau_id];
				}
			});
		});

		return realtime_vehicle_locations;
	});

	route_cache.update((realtime_vehicle_route_cache) => {
		Object.keys(realtime_vehicle_route_cache).forEach((chateau_id) => {
			if (!chateaus_in_frame_set.has(chateau_id)) {
				delete realtime_vehicle_route_cache[chateau_id];
			}
		});

		return realtime_vehicle_route_cache;
	});

	route_cache_agencies_known.update((realtime_vehicle_route_cache) => {
		Object.keys(realtime_vehicle_route_cache).forEach((chateau_id) => {
			if (!chateaus_in_frame_set.has(chateau_id)) {
				delete realtime_vehicle_route_cache[chateau_id];
			}
		});

		return realtime_vehicle_route_cache;
	});

	realtime_vehicle_locations_last_updated_store.update(
		(realtime_vehicle_locations_last_updated) => {
			Object.keys(realtime_vehicle_locations_last_updated).forEach((chateau_id) => {
				if (!chateaus_in_frame_set.has(chateau_id)) {
					delete realtime_vehicle_locations_last_updated[chateau_id];
				}
			});

			return realtime_vehicle_locations_last_updated;
		}
	);
}
