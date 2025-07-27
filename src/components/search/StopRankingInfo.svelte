<script lang="ts">
	import { onMount } from 'svelte';
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
	} from '../../globalstores';

     
export let stop: any;
import haversine from 'haversine-distance';

export let stops_section: any;

let geolocation: GeolocationPosition | null;

geolocation_store.subscribe((g) => {
    geolocation = g;
});


let distance_metres = 0;

function recompute_distance() {
    const user = {latitude: geolocation.coords.latitude,
        longitude: geolocation.coords.longitude
    };

    const stop_pos = {
        latitude: stop.point.y,
        longitude: stop.point.x
    };

    distance_metres= haversine(user, stop_pos);
}

onMount(() => {
    if (geolocation) {
        recompute_distance();
    }
});
    
</script>

<div>
    <p class="dark:text-white cursor-pointer">{stop.name}</p>

    <p class='text-xs dark:text-gray-50 cursor-pointer'>
        {#if geolocation}
            {#if distance_metres > 1000}
                {(distance_metres/1000).toFixed(1)} km
            {:else}
                {distance_metres.toFixed(0)} m
            {/if}
        {/if}
    </p>
</div>