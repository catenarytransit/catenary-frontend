<script lang="ts">
let text_input = "";

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

    import {
		MapSelectionScreen,
		StackInterface,
		MapSelectionOption,
		SingleTrip,
		VehicleMapSelector,
		RouteStack,
		StopStack,
		RouteMapSelector,
        SettingsStack
	} from '../stackenum';

    import { init_locales } from '../../i18n';
	import { _ } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
</script>

{#if !$isLoading}
<div class="rounded-full py-1 px-2 bg-white-500 border border-gray-500 dark:bg-gray-900 dark:text-white  md:w-[350px]">
    <div class="flex flex-row gap-x-1 align-middle items-center">
        <img src="/logo.svg" alt="Catenary" class="h-4 mr-1 inline align-middle my-auto" />
        <input type="text" bind:value={text_input} class="w-full focus:outline-none" placeholder={$_("search_here")}>
        <button
			class="text-seashore dark:text-seashoredark cursor-pointer mx-2 inline-block align-middle"
			on:click={() => {
				data_stack_store.update((x) => {
					x.push(new StackInterface(new SettingsStack()));
					return x;
				});
			}}
			aria-label="Settings"
			><span class="material-symbols-outlined inline-block align-middle"> settings </span>
		</button>
    </div>
</div>
{/if}