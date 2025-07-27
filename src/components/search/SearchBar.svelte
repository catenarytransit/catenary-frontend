<script lang="ts">

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
	import { text_input_store } from './search_data';
	import {get} from 'svelte/store'

	import { new_query, autocomplete_focus_state } from './search_data';

	let show_back_button = false;

	
let text_input = get(text_input_store);

function handle_text_change(event) {
	text_input = event.target.value;
	text_input_store.set(text_input);

	new_query(text_input);

	autocomplete_focus_state.set(true);
}

function focus_on_input(event) {
	autocomplete_focus_state.set(true);
	
	show_back_button_recalc();
}

function on_blur_input(event) {
	

	show_back_button_recalc();
}



function show_back_button_recalc() {
	if (window.innerWidth < 768) {
		if (get(autocomplete_focus_state) == true) {
			show_back_button = true;
		} else {
			show_back_button = false;
		}
	} else {
		
	show_back_button = false;
	}

}

</script>

{#if !$isLoading}
<div class="rounded-full py-1 px-2 bg-white-500 border border-gray-500 dark:bg-gray-900 dark:text-white w-full md:w-[350px]">
    <div class="flex flex-row gap-x-1 align-middle items-center">
        {#if show_back_button == true}
		<button
		class="text-seashore dark:text-seashoredark text-sm cursor-pointer mx-2 inline-block align-middle"
		on:click={() => {
			data_stack_store.update((x) => {
				x.push(new StackInterface(new SettingsStack()));
				return x;
			});
		}}
		aria-label="Settings"
		><span class="material-symbols-outlined inline-block align-middle"> arrow_back </span>
	</button>
		{:else}
		<img src="/logo.svg" alt="Catenary" class="h-4 mr-1 inline align-middle my-auto" />
		{/if}
        <input type="text" 
		on:input={handle_text_change}
		on:focus={focus_on_input}
		on:blur={on_blur_input}
		bind:value={text_input} class="w-full focus:outline-none" placeholder={$_("search_here")}/>
        
		{#if text_input.length == 0}
		<button
			class="text-seashore dark:text-seashoredark text-sm cursor-pointer mx-2 inline-block align-middle"
			on:click={() => {
				data_stack_store.update((x) => {
					x.push(new StackInterface(new SettingsStack()));
					return x;
				});
			}}
			aria-label="Settings"
			><span class="material-symbols-outlined inline-block align-middle"> settings </span>
		</button>
		{/if}
    </div>
</div>
{/if}