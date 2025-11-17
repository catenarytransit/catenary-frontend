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
    consentGiven,
    current_orm_layer_type_store
} from '../globalstores';

import { get, writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

export const additional_filter_for_vehicles_store: Writable<any> = writable(null);

export function resetAdditionalVehicleFilter() {
    additional_filter_for_vehicles_store.set(null);
}

export function applyVehicleFilters(categoryvalues: Record<string, any>) {
    let showzombiebuses = get(show_zombie_buses_store);

    let map = get(map_pointer_store);

    let pointerfilter = ['all', ['!=', 0, ['get', 'bearing']], ['==', true, ['get', 'has_bearing']]];

    let vehicle_filter = ['all'];

    if (showzombiebuses == false) {
        vehicle_filter.push(['!=', '', ['get', 'trip_id']]);
        vehicle_filter.push(['has', 'trip_id']);

        pointerfilter.push(['==', true, ['get', 'has_bearing']]);
    }

    if (categoryvalues.livedots === 'tram') {
        const routeTypeFilter = [
            'any',
            ['==', ['get', 'route_type'], 0],
            ['==', ['get', 'route_type'], 5]
        ];
        pointerfilter.push(routeTypeFilter);
        vehicle_filter.push(routeTypeFilter);
    } else if (categoryvalues.livedots === 'metro') {
        const routeTypeFilter = [
            'any',
            ['==', ['get', 'route_type'], 1],
            ['==', ['get', 'route_type'], 7]
        ];
        pointerfilter.push(routeTypeFilter);
        vehicle_filter.push(routeTypeFilter);
    }

    let additional_filter = get(additional_filter_for_vehicles_store);

    if (additional_filter) {
        vehicle_filter.push(additional_filter);
    }

    if (map.getLayer(categoryvalues.livedots)) {
        map?.setFilter(categoryvalues.pointing, pointerfilter);
        map?.setFilter(categoryvalues.pointingshell, pointerfilter);

        map?.setFilter(categoryvalues.livedots, vehicle_filter);
        map?.setFilter(categoryvalues.labeldots, vehicle_filter);
    }
}
