<script lang="ts">
	import { get } from "svelte/store";
    import {latest_query_data, text_input_store, autocomplete_focus_state, show_back_button_recalc } from "./search_data";
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
    import StopRankingInfo from './StopRankingInfo.svelte';

    let latest_query_data_local = get(latest_query_data);
    let text_input = get(text_input_store);

    text_input_store.subscribe((n) => text_input=n);
    
    import {StopStack, StackInterface} from '../stackenum';

    export let length = 16;

    latest_query_data.subscribe((new_data) => {
        latest_query_data_local = new_data;
        console.log("new data in search", new_data);
    });

    let geolocation: GeolocationPosition | null;

    geolocation_store.subscribe((g) => {
        geolocation = g;
    });
</script>

<div id='search_autocomplete_a'>
    
{#if text_input.length > 0}

    {#if latest_query_data_local}
{#each latest_query_data_local.stops_section.ranking.slice(0,length) as stop_ranked}
{#if !(latest_query_data_local.stops_section.stops[stop_ranked.chateau][stop_ranked.gtfs_id].parent_station)}

<div class="px-3 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
    on:click={() => {
       data_stack_store.update((data_stack) => {
									data_stack.push(
										
    new StackInterface(new StopStack(stop_ranked.chateau, stop_ranked.gtfs_id))
									);

									return data_stack;
								});

                                console.log("on click triggered");

                                autocomplete_focus_state.set(false);
                                show_back_button_recalc();
    }}
>
{#key stop_ranked.gtfs_id}
    <StopRankingInfo
        stop={latest_query_data_local.stops_section.stops[stop_ranked.chateau][stop_ranked.gtfs_id]}
        stops_section={latest_query_data_local.stops_section}
        stop_ranked={stop_ranked}
    />
    {/key}
</div>    
{/if}
{/each}
{/if}
{/if}
</div>