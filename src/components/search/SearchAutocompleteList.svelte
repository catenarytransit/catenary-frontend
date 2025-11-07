<script lang="ts">
	import { map_pointer_store } from './../../globalstores';
	import { get } from 'svelte/store';
	import {
		latest_query_data,
		text_input_store,
		autocomplete_focus_state,
		show_back_button_recalc,
		latest_nominatim_data
	} from './search_data';
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

	let latest_nominatim_data_local = get(latest_nominatim_data);

	latest_nominatim_data.subscribe((n) => {
		latest_nominatim_data_local = n;
		console.log(n);
	});

	text_input_store.subscribe((n) => (text_input = n));

	import { StopStack, StackInterface, OsmItemStack, RouteStack } from './../stackenum';
	import RouteResultItem from './RouteResultItem.svelte';

	export let length = 16;

	latest_query_data.subscribe((new_data) => {
		latest_query_data_local = new_data;
		console.log('new data in search', new_data);
	});

	let geolocation: GeolocationPosition | null;

	geolocation_store.subscribe((g) => {
		geolocation = g;
	});
</script>

<div id="search_autocomplete_a flex flex-col">
	{#if text_input.length > 0}
		{#if latest_nominatim_data_local}
			{#each latest_nominatim_data_local
				.filter((x) => x.addresstype != 'railway' && x.type != 'bus_stop')
				.slice(0, length) as nom_item}
				<button
					on:click={() => {
						let map = get(map_pointer_store);

						autocomplete_focus_state.set(false);

						data_stack_store.update((data_stack) => {
							let nom_type_cleaned : string | null = null;

                            if (nom_item.osm_type == 'relation') {
                                nom_type_cleaned = "R";
                            } else {
                                if (nom_item.osm_type == 'way') {
                                    nom_type_cleaned = 'W';
                                }
                            }

                            console.log('nom type', nom_item.osm_type, nom_type_cleaned);

							data_stack.push(
								new StackInterface(
									new OsmItemStack(nom_item.osm_id, nom_item.category, nom_type_cleaned)
								)
							);
							return data_stack;
						});

						if (nom_item.boundingbox) {
							map.fitBounds([
								[nom_item.boundingbox[2], nom_item.boundingbox[0]],
								[nom_item.boundingbox[3], nom_item.boundingbox[1]]
							]);
						} else {
							map.flyTo({
								center: [nom_item.lon, nom_item.lat]
							});
						}

						autocomplete_focus_state.set(false);
						show_back_button_recalc();
					}}
					class="px-3 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer w-full"
				>
					<div class="align-start flex flex-col content-start items-start text-left">
						<p class="font-medium dark:text-white">
							{nom_item.name}
							<span class="font-light text-xs text-gray-700 dark:text-gray-300"
								>{nom_item.addresstype}</span
							>
						</p>
						<p class="text-[10px] text-gray-800 dark:text-gray-200">{nom_item.display_name}</p>
					</div>
				</button>
			{/each}
		{/if}

        {#if latest_query_data_local && latest_query_data_local.routes_section}
            {#each latest_query_data_local.routes_section.ranking.slice(0, length) as route_ranked}
                {#if latest_query_data_local.routes_section.routes[route_ranked.chateau] && latest_query_data_local.routes_section.routes[route_ranked.chateau][route_ranked.gtfs_id]}
                    {@const routeInfo = latest_query_data_local.routes_section.routes[route_ranked.chateau][route_ranked.gtfs_id]}
                    <RouteResultItem
					chateau = {route_ranked.chateau}
					route_id = {route_ranked.gtfs_id}
                        {routeInfo}
                        onClick={() => {
                            data_stack_store.update((data_stack) => {
                                data_stack.push(
                                    new StackInterface(new RouteStack(route_ranked.chateau, route_ranked.gtfs_id))
                                );
                                return data_stack;
                            });
                            autocomplete_focus_state.set(false);
                            show_back_button_recalc();
                        }}
                    />
                {/if}
            {/each}
        {/if}

		{#if latest_query_data_local}
			{#each latest_query_data_local.stops_section.ranking.slice(0, length) as stop_ranked}
                {#if latest_query_data_local.stops_section.stops[stop_ranked.chateau][stop_ranked.gtfs_id]}

				{#if !latest_query_data_local.stops_section.stops[stop_ranked.chateau][stop_ranked.gtfs_id].parent_station}
					<button
						class="px-3 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer w-full flex flex-col content-start items-start align-left"
						on:click={() => {
							data_stack_store.update((data_stack) => {
								data_stack.push(
									new StackInterface(new StopStack(stop_ranked.chateau, stop_ranked.gtfs_id))
								);

								return data_stack;
							});

							console.log('on click triggered');

							autocomplete_focus_state.set(false);
							show_back_button_recalc();
						}}
					>
						{#key stop_ranked.gtfs_id}
							<StopRankingInfo
								stop={latest_query_data_local.stops_section.stops[stop_ranked.chateau][
									stop_ranked.gtfs_id
								]}
								stops_section={latest_query_data_local.stops_section}
								{stop_ranked}
							/>
						{/key}
					</button>
				{/if}
                {/if}
			{/each}
		{/if}
	{/if}
</div>
