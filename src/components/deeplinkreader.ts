import {
	MapSelectionScreen,
	StackInterface,
	MapSelectionOption,
	SingleTrip,
	VehicleMapSelector,
	RouteStack,
	StopStack,
	RouteMapSelector
} from '../components/stackenum';

import {
	data_stack_store,
	on_sidebar_trigger_store,
	realtime_vehicle_locations_last_updated_store,
	realtime_vehicle_locations_store,
	realtime_vehicle_route_cache_hash_store,
	realtime_vehicle_route_cache_store,
	lock_on_gps_store,
	usunits_store,
	show_zombie_buses_store,
	show_my_location_store,
	custom_icons_category_to_layer_id,
	map_pointer_store,
	geolocation_store,
	chateaus_store,
	show_gtfs_ids_store,
	ui_theme_store,
	show_topo_global_store,
	current_orm_layer_type_store
} from '../globalstores';

import { writable, get } from 'svelte/store';

export function deep_link_url_reader() {
	const urlParams = new URLSearchParams(window.location.search);

	let screenName = urlParams.get('screen');

	if (screenName) {
		if (screenName == 'route') {
			let chateau = urlParams.get('chateau');
			let route_id = urlParams.get('route_id');

			if (chateau && route_id) {
				data_stack_store.update((data_stack) => {
					data_stack.push(new StackInterface(new RouteStack(chateau, route_id)));

					return data_stack;
				});
			}
		}

		if (screenName == 'block') {
		}

		if (screenName == 'stop') {
		}
	}
}
