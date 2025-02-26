import { layerspercategory } from "./layernames";

import {map_pointer_store, stops_to_hide_store} from '../globalstores';
import {get} from 'svelte/store';

export const default_bus_filter = [
    'all',
    ['!', ['in', 1, ['get', 'route_types']]],
    ['!', ['in', 0, ['get', 'route_types']]],
    ['!', ['in', 2, ['get', 'route_types']]]
];

export function make_stops_filter_part_for_chateau(chateau: string, stop_array: string[]) {
    let filter_part = ['!', [
        'all',
        ['in', ['get', 'gtfs_id'],  ["literal", [...stop_array]]],
        ['==', ['get', 'chateau'], chateau]
    ]];
    return filter_part;
}

export function refilter_stops() {
    let map_pointer = get(map_pointer_store);
    if (map_pointer) {
    
    let new_bus_filter = structuredClone(default_bus_filter);

    let stops_to_hide = get(stops_to_hide_store);

    for (let chateau in stops_to_hide) {
        new_bus_filter.push(make_stops_filter_part_for_chateau(chateau, stops_to_hide[chateau]));
    }

    console.log("new filter for stops", new_bus_filter);

    if (layerspercategory.bus.stops) {
        map_pointer.setFilter(layerspercategory.bus.stops, new_bus_filter);
        map_pointer.setFilter(layerspercategory.bus.labelstops, new_bus_filter);
    }

    if (layerspercategory.intercityrail.stops) {
      //  map_pointer.setFilter(layerspercategory.intercityrail.stops, new_bus_filter);
        map_pointer.setFilter(layerspercategory.intercityrail.labelstops, new_bus_filter);
    }

    if (layerspercategory.metro.stops) {
       // map_pointer.setFilter(layerspercategory.metro.stops, new_bus_filter);
        map_pointer.setFilter(layerspercategory.metro.labelstops, new_bus_filter);
    }

    if (layerspercategory.tram.stops) {
      //  map_pointer.setFilter(layerspercategory.tram.stops, new_bus_filter);
        map_pointer.setFilter(layerspercategory.tram.labelstops, new_bus_filter);
    }
}
}

export function delete_filter_stops_background() {
    stops_to_hide_store.set({});
    refilter_stops();
}