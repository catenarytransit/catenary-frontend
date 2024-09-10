

<script lang="ts">
    let stops_table: Record<string, Record<string, any>> = {};
    let departure_list: any[] = [];
    
	import { onMount } from 'svelte';
	import { writable, get } from 'svelte/store';
	import { _ } from 'svelte-i18n';
	import DelayDiff from './DelayDiff.svelte';
	import TimeDiff from './TimeDiff.svelte';
	import type { Writable } from 'svelte/store';

    setInterval(() => {
        current_time = Date.now();
    }, 300);

    import {
		dark_mode_store,
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

		nearby_deps_cache_gps

	} from '../globalstores';
	import { SingleTrip, StackInterface } from './stackenum';
	import { t } from 'svelte-i18n';

    let current_time: number = Date.now();

    let first_load = false;

    onMount(() => {
        let hit_nearby_deps_cache = get(nearby_deps_cache_gps);

        if (hit_nearby_deps_cache) {
            stops_table = hit_nearby_deps_cache.stop;
            departure_list = hit_nearby_deps_cache.departures;
        }

        getNearbyDepartures();
    
        let interval = setInterval(() => {
            getNearbyDepartures();
        }, 20_000);

        setTimeout(() => {
            getNearbyDepartures();
            first_load = true;
        }, 1500);

        return () => {
            clearInterval(interval);
        };
    });



    let loading = false;

    async function getNearbyDepartures() {
        loading = true;
        
        let geolocation_of_user = get(geolocation_store);

        if (geolocation_of_user) {

        let url = `https://birch.catenarymaps.org/nearbydeparturesfromcoords?lat=${geolocation_of_user?.coords.latitude}&lon=${geolocation_of_user?.coords.longitude}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                stops_table = data.stop;
                departure_list = data.departures;
                loading = false;

                nearby_deps_cache_gps.set(data);
            });
        }
    }
 </script>

 <div class=" catenary-scroll overflow-y-auto pb-32 h-full">
   <div class="flex flex-col gap-y-5">
    {#each departure_list as route_group }
    <div class="px-2 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg shadow-md dark:shadow-slate-800">
        <p style={`color: ${route_group.color}`}>
            {#if route_group.short_name}
            
             <span class="font-bold">{route_group.short_name}</span>
            {/if}
            
            {#if route_group.long_name}
            
             <span class="font-medium">{route_group.long_name}</span>
            {/if}
       
           
        </p>
       
        {#each Object.entries(route_group.directions) as [d_id, direction_group] }
        <p>
            <span class="px-0.5 mr-2 bg-slate-600"></span>
            {direction_group.headsign}</p>
       
            <p class='text-sm'>🚏 {stops_table[route_group.chateau_id][direction_group.trips[0].stop_id].name}</p>
       
            <div class="flex flex-row gap-x-1 overflow-x-auto  catenary-scroll">
            {#each direction_group.trips.filter((x) => x.departure_schedule  > (Date.now() / 1000) - 900) as trip }
                <div class="bg-white dark:bg-slate-800 hover:bg-blue-300 hover:dark:bg-blue-900 p-1 rounded-md min-w-24"
                    on:click={() => {
                        data_stack_store.update((stack) => {
                            stack.push(new StackInterface(
                                new SingleTrip(
                                    route_group.chateau_id,
                                    trip.trip_id,
                                    route_group.route_id,
                                    null,
                                    trip.gtfs_schedule_start_day.replace(/-/g, ""),
                                    null,
                                    route_group.route_type
                                ),
                            ));
       
                            return stack;
                        }
                    
                        
                    );
                    }}
                >
                    {#if route_group.route_type == 2 && trip.trip_short_name}
                    <p class="font-medium text-sm md:text-sm">{trip.trip_short_name}</p>
                    {/if}
       
                    {#if trip.departure_schedule}
                    <TimeDiff
                    show_brackets={false}
                    show_seconds={false}
                    diff={(trip.departure_realtime || trip.departure_schedule) - current_time / 1000} />
                    {/if}
       
                    <p class="text-xs md:text-sm">
                       

                        {
                            new Intl.DateTimeFormat('en-GB', {
                                hour: "numeric",
                                minute: "numeric",
    timeZone: trip.tz,
  }).format(new Date((trip.departure_realtime || trip.departure_schedule) * 1000))
                        }
                    </p>
       
                    {#if trip.cancelled}
                        <span class="text-red-500">{$_('cancelled')}</span>
                    {/if}
       
                    {#if trip.departure_realtime != null && trip.departure_schedule != null}
                    
                    <DelayDiff 
                    diff={trip.departure_schedule - trip.departure_realtime} />
                    {/if}
                    
                </div>
                {/each}
            </div>
        {/each}
    </div>
 {/each}
   </div>
 </div>