import {
	MapSelectionScreen,
	StackInterface,
	MapSelectionOption,
	SingleTrip,
	VehicleMapSelector,
	RouteStack,
	StopStack,
	RouteMapSelector
} from './components/stackenum';

import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

export const data_stack_store: Writable<StackInterface[]> = writable([]);
export const on_sidebar_trigger_store = writable(0);

export const realtime_vehicle_locations_store: Writable<
	Record<string, Record<string, Record<string, any>>>
> = writable({});
export const realtime_vehicle_route_cache_store: Writable<
	Record<string, Record<string, Record<string, any>>>
> = writable({});
export const realtime_vehicle_route_cache_hash_store: Writable<
	Record<string, number>
> = writable({});
export const realtime_vehicle_locations_last_updated_store: Writable<
	Record<string, number>
> = writable({});
export const lock_on_gps_store = writable(false);

export interface NearbySelectionFilterRouteType {
	bus: boolean,
	metro: boolean,
	rail: boolean,
	other: boolean
}

export const nearby_departures_filter: Writable<NearbySelectionFilterRouteType> = writable({
	bus:true,
	metro: true,
	rail: true,
	other: true
});

//depreciated
export const dark_mode_store = writable(false);

// system, light, dark
export const ui_theme_store:Writable<string> = writable('system');

export const show_zombie_buses_store = writable(false);

export const usunits_store = writable(false);
export const show_my_location_store = writable(true);
export const show_gtfs_ids_store = writable(false);

export const custom_icons_category_to_layer_id: Writable<Record<string, string[]>> = writable({});

export const map_pointer_store: Writable<maplibregl.Map | null> = writable(null);

export const geolocation_store: Writable<GeolocationPosition | null> = writable(null);

export const nearby_deps_cache_gps: Writable<any | null> = writable(null);

export const chateaus_store: Writable<any | null> = writable(null);

export const show_seconds_store = writable(false);

export const show_topo_global_store = writable(false);