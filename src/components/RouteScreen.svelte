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
	let fetchtimeout: NodeJS.Timeout | null = null;
	let updatetimecounter: NodeJS.Timeout | null = null;
	let show_previous_stops: boolean = false;
	let bind_scrolling_div: null | HTMLElement = null;

	import {
		has_schedule_pdf,
		find_schedule_pdf_initial,
		schedule_pdf_needs_hydration,
		find_schedule_pdf
	} from './pdf_schedules';

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
	import RouteHeading from './RouteHeading.svelte';

	let stop_id_to_alert_ids: Record<string, string[]> = {};

	let alerts: Record<string, any> = {};

	export let routestack: RouteStack;

	export let darkMode: boolean = false;

	let initial_data_load = {};

	let loaded = false;

	let route_data: any = null;

	let pdf_url: string | null = null;

	function fix_route_url(x: string): string {
		if (x.includes("foothilltransit.org") && !x.includes("www.foothilltransit.org")) {
			return x.replace("foothilltransit.org", "www.foothilltransit.org");
		} else {
			return x;
		}
	}

	async function fetch_route_selected() {
		let map = get(map_pointer_store);

		map.getSource('transit_shape_context').setData({
			type: 'FeatureCollection',
			features: []
		});

		map.getSource('stops_context').setData({
			type: 'FeatureCollection',
			features: []
		});

		//insert pdf urls

		if (has_schedule_pdf(routestack.chateau_id)) {
			pdf_url = find_schedule_pdf_initial(routestack.chateau_id, routestack.route_id);
		}

		if (schedule_pdf_needs_hydration(routestack.chateau_id)) {
			find_schedule_pdf(routestack.chateau_id, routestack.route_id)
				.then((answer) => (pdf_url = answer))
				.catch((pdferr) => console.error(pdferr));
		}

		let url = new URL(
			`https://birch.catenarymaps.org/route_info?chateau=${routestack.chateau_id}&route_id=${routestack.route_id}`
		);

		await fetch(url.toString()).then(async (response) => {
			let text = await response.text();
			try {
				const data = JSON.parse(text);
				console.log('route data', data);
				loaded = true;

				route_data = data;
			} catch (err) {
				console.error(err);
			}
		});
	}

	$: if (routestack) {
		fetch_route_selected();
	}

	let activePattern = ''
</script>

<div class="pl-4 sm:pl-2 lg:pl-4 pt-2 h-full">
	<div
		bind:this={bind_scrolling_div}
		class="flex flex-col catenary-scroll overflow-y-auto h-full pb-32"
	>
		{#if loaded == true}
			<RouteHeading
				color={route_data.color}
				route_id={routestack.route_id}
				chateau_id={routestack.chateau_id}
				text={route_data.agency_name}
				compact={false}
				short_name={route_data.short_name}
				long_name={route_data.long_name}
				url={route_data.url}
				{darkMode}
			/>

			<p>Directions</p>
			<p>
				<div class="flex flex-row gap-x-1 overflow-x-auto catenary-scroll min-h-[100px]">
					{#each Object.entries(route_data.direction_patterns) as direction, index}
						<div on:click={() => activePattern = direction[1].direction_pattern.direction_pattern_id} class={`bg-white dark:bg-slate-800 hover:bg-seashore p-2 m-1 mb-2 flex rounded-md min-w-36 ${direction[1].direction_pattern.direction_pattern_id ? 'bg-seashore' : ''}`}>
							&rarr; {direction[1].direction_pattern.headsign_or_destination}
						</div>
					{/each}
				</div>
				{#if activePattern != ''}
					{#each route_data.direction_patterns[activePattern].rows as stop}
						<span class="">
							{fixStationName(route_data.stops[stop.stop_id].name)}
						</span>
					{/each}
				{/if}
				
				<!-- {#each Object.entries(route_data.direction_patterns) as direction, index}
						<div>
							<p class="font-md my-3">&rarr; {direction[1].direction_pattern.headsign_or_destination}</p>
							<div class="flex flex-row gap-x-1 overflow-x-auto catenary-scroll">
								{#each direction[1].rows as stop}
									<div class="bg-white dark:bg-slate-800 hover:bg-seashore p-2 m-1 mb-2 flex rounded-md min-w-36">
										{fixStationName(route_data.stops[stop.stop_id].name)}
									</div>
								{/each}
							</div>
						</div>
				{/each}
				</p> -->
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
