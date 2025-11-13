import {
	ui_theme_store,
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
	dark_mode_store
} from '../globalstores';

import { get } from 'svelte/store';
import { determineDarkModeToBool } from './determineDarkModeToBool';

let map = get(map_pointer_store);

export async function add_image_pedestrian_pattern(map) {
	if (!map.hasImage('pattern-ped')) {
		const response = await map.loadImage('/pattern-ped_2_50.png');

		map.addImage('pattern-ped', response.data);

		const response_xs = await map.loadImage('/pattern-ped_3_33.png');

		map.addImage('pattern-ped-xs', response_xs.data);
	}

	let dark_mode = determineDarkModeToBool();

	if (dark_mode == true) {
		map.setPaintProperty('pedestrian_area_pattern', 'fill-pattern', null);
		map.setPaintProperty('ped-area', 'fill-pattern', null);
	} else {
		map.setPaintProperty('pedestrian_area_pattern', 'fill-pattern', [
			'step',
			['zoom'],
			'pattern-ped-xs',
			17,
			'pattern-ped'
		]);
		map.setPaintProperty('ped-area', 'fill-pattern', [
			'step',
			['zoom'],
			'pattern-ped-xs',
			17,
			'pattern-ped'
		]);
	}
}
