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

export const data_stack_store:Writable<StackInterface[]> = writable([]);
export const on_sidebar_trigger_store = writable(0);

export const realtime_vehicle_locations_store: Writable<Record<string, Record<string, Record<string, any>>>> = writable({});
export const realtime_vehicle_route_cache_store: Writable<Record<string, Record<string, Record<string, any>>>> = writable({});
export const realtime_vehicle_route_cache_hash_store: Writable<Record<string, Record<string, number>>> = writable({});
export const realtime_vehicle_locations_last_updated_store: Writable<Record<string, Record<string, number>>> = writable({});
export const lock_on_gps_store = writable(false);

export const dark_mode_store = writable(false);

export const show_zombie_buses_store = writable(false);

export const usunits_store = writable(false);