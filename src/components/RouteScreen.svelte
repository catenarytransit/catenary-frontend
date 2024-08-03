<script lang="ts">
	import { json } from '@sveltejs/kit';
	import { RouteStack, SingleTrip } from './stackenum';
	import { onDestroy, onMount } from 'svelte';
	import { locale, locales } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
	import { _ } from 'svelte-i18n';
	import RouteIcon from './RouteIcon.svelte';
	import { lightenColour } from './lightenDarkColour';
	import DelayDiff from './DelayDiff.svelte';
	import TimeDiff from './TimeDiff.svelte';
	import polyline from '@mapbox/polyline';
	import { writable, get } from 'svelte/store';
	import {
		fixHeadsignIcon,
		fixHeadsignText,
		fixRouteIcon,
		fixRouteName,
		fixRouteNameLong,
		fixRunNumber,
		fixStationName
	} from './agencyspecific';
	import mapboxgl from 'mapbox-gl';
	let is_loading_trip_data: boolean = true;
	let trip_data: Record<string, any> | null = null;
	let init_loaded = 0;
	let timezones: string[] = [];
	let error: string | null = '';
	let stoptimes_cleaned_dataset: Array<Record<string, any>> = [];
	let current_time: number = Date.now();
	let fetchtimeout:NodeJS.Timeout |null= null;
	let updatetimecounter :NodeJS.Timeout |null= null;
	let show_previous_stops: boolean = false;
	let bind_scrolling_div: null | HTMLElement = null;

	import {has_schedule_pdf, find_schedule_pdf_initial, schedule_pdf_needs_hydration, find_schedule_pdf} from './pdf_schedules'
	
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
		map_pointer_store
	} from '../globalstores';

	let stop_id_to_alert_ids: Record<string, string[]> = {};

	let alerts: Record<string, any> = {};

	export let routestack:RouteStack;

	export let darkMode: boolean = false;

	let initial_data_load = {};

	let loaded = false;

	let route_data:any = null;

	let pdf_url:  string | null = null;

	async function fetch_route_selected() {
		let map = get(map_pointer_store);

		map.getSource("transit_shape_context").setData(
			{
                    type: 'FeatureCollection',
                    features: [
						
					]
                }
							);

							map.getSource("stops_context").setData(
		
		{
				type: 'FeatureCollection',
				features: [
					
				]
			}
	);

		//insert pdf urls

		if (has_schedule_pdf(routestack.chateau_id)) {
						
						 pdf_url = find_schedule_pdf_initial(routestack.chateau_id, routestack.route_id);
	
						}
	
						if (schedule_pdf_needs_hydration(routestack.chateau_id)) {
							find_schedule_pdf(routestack.chateau_id, routestack.route_id)
							.then((answer) => pdf_url = answer)
							.catch((pdferr) => console.error(pdferr));
						}

		let url = new URL(
`https://birch.catenarymaps.org/route_info?chateau=${routestack.chateau_id}&route_id=${routestack.route_id}`			
		);

		await fetch(url.toString())
		.then(async (response) => {
				let text = await response.text();
				try {
					const data = JSON.parse(text);
					console.log('route data', data);
					loaded = true;

					route_data = data;

				} catch (err) {
					console.error(err)
				}} 
			);
		
	}

	$: if (routestack) {
		fetch_route_selected();
	}

</script>

<div class="pl-4 sm:pl-2 lg:pl-4 pt-2 h-full">
	<div
			
			

			bind:this={bind_scrolling_div}
			class="flex flex-col catenary-scroll overflow-y-auto h-full pb-32">
	{#if loaded == true}
		<h2 class="text-md">{route_data.agency_name}</h2>

		<h2 style={`color: ${darkMode ? lightenColour(route_data.color) : route_data.color}`}>
			
			{#if route_data.short_name}
			<span class="text-lg font-bold">{route_data.short_name}</span>
			{/if}
			
			{#if route_data.long_name}
			<span class="text-lg font-medium">{route_data.long_name}</span>
			{/if}</h2>

			
			<div class="flex flex-row gap-x-2">
				{#if pdf_url != null}
				<a href={pdf_url}>
					<div class='px-1 py-0.5 border-sky-500 text-sky-600 dark:text-blue-200 flex flex-row align-middle justify-center dark:border-sky-200 rounded-full border-2 hover:text-white hover:bg-blue-600 hover:transition-colors'>
						<span class="material-symbols-outlined font-medium text-2xl align-middle">
							attachment
							</span>
							<span class="font-bold font-mono text-base md:text-lg">PDF</span>
					</div>
				</a>
				{/if}
			</div>

			{#if route_data.url != null}
				<a class="text-sky-600 dark:text-sky-400 underline text-wrap text-sm" href={route_data.url}>
					{route_data.url}
				</a>
				{/if}

				<p>Directions</p>
<div class="divide-y bg-slate-200 dark:bg-slate-800 divide-gray-500">
			{
				#each Object.entries(route_data.direction_patterns) as direction, index
			}
			<div class="py-1 px-2 flex flex-row">
				<div>
					
				</div>
				<div>
					<p class="font-medium">{direction[1].direction_pattern.headsign_or_destination}</p>
				<p>{direction[1].rows.length} {" stops"}</p>
				
				</div>
				

			</div>

				
		
			{/each}
</div>
			
			{:else}
			<div
					class="border-t w-full border-slate-200 dark:border-slate-700 py-3 flex flex-col gap-y-2"
				>
					<div class="h-5 w-1/2 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
					<div class="h-3 w-1/4 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
					<div class="h-3 w-2/5 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
				</div>

				<div
					class="border-t w-full border-slate-200 dark:border-slate-700 py-3 flex flex-col gap-y-2"
				>
					<div class="h-5 w-1/2 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
					<div class="h-3 w-1/4 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
					<div class="h-3 w-2/5 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
				</div>
	{/if}
	</div>
</div>