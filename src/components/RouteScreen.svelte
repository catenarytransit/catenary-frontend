<script lang="ts">
	import { json } from '@sveltejs/kit';
	import { RouteStack, SingleTrip } from './stackenum';
	import { onDestroy, onMount } from 'svelte';
	import { locale, locales } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
	import { _ } from 'svelte-i18n';
	import RouteIcon from './RouteIcon.svelte';
	import {titleCase} from './../utils/titleCase';
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


	let activePattern: string = '';

	let stop_id_to_alert_ids: Record<string, string[]> = {};

	let alerts: Record<string, any> = {};

	export let routestack: RouteStack;

	export let darkMode: boolean = false;

	let initial_data_load = {};

	let loaded = false;

	let route_data: any = null;

	let pdf_url: string | null = null;

	function fix_route_url(x: string): string {
		if (x.includes('foothilltransit.org') && !x.includes('www.foothilltransit.org')) {
			return x.replace('foothilltransit.org', 'www.foothilltransit.org');
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
			`https://birch.catenarymaps.org/route_info?chateau=${routestack.chateau_id}&route_id=${encodeURIComponent(routestack.route_id)}`
		);

		await fetch(url.toString()).then(async (response) => {
			let text = await response.text();
			try {
				const data = JSON.parse(text);
				console.log('route data', data);
				loaded = true;

				route_data = data;

				activePattern = Object.keys(route_data.direction_patterns)[0];
			} catch (err) {
				console.error(err);
			}
		});
	}

	$: if (routestack) {
		fetch_route_selected();
	}

</script>

<div class="h-full">
	{#if loaded == true}
		<div class="px-3">
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
		</div>
		<p class="px-3 text-xl my-2">Directions</p>
		<div class="flex flex-row gap-x-1 overflow-x-auto catenary-scroll min-h-[100px]">
			{#each Object.entries(route_data.direction_patterns) as direction, index}
				<div
					on:click={() => (activePattern = direction[1].direction_pattern.direction_pattern_id)}
					class={` text-sm  hover:bg-seashore p-2 m-1 mb-2 flex rounded-md min-w-36  leading-tight ${direction[1].direction_pattern.direction_pattern_id == activePattern ? 'bg-seashore' : 'bg-white dark:bg-slate-800'}`}
				>
					<span class="material-symbols-outlined">chevron_right</span>
					{titleCase(direction[1].direction_pattern.headsign_or_destination)}
				</div>
			{/each}
		</div>
		<div
			bind:this={bind_scrolling_div}
			class="flex flex-col catenary-scroll overflow-y-auto h-full pb-96 pt-4"
		>
			{#if activePattern != ''}
				{#each route_data.direction_patterns[activePattern].rows as stop, index}
					<span class="relative px-3">
						{#if index != route_data.direction_patterns[activePattern].rows.length - 1}
							<div
								class={`absolute top-1/2 bottom-1/2 left-3 w-2 h-7 z-30 rounded-xl`}
								style:background-color={route_data.color}
							></div>
						{/if}
						<div
							class={`absolute top-[10px] bottom-1/2 left-3 w-2 h-2 rounded-full bg-white z-30`}
						></div>
						<span class="text-sm relative ml-[16px] translate-y-px"
							>{fixStationName(route_data.stops[stop.stop_id].name)}</span
						>
					</span>
				{/each}
			{/if}
		</div>
	{:else}
		<div class="w-full p-2 flex flex-col gap-y-2">
			<div class="h-5 w-1/2 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
			<div class="h-3 w-1/4 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
			<div class="h-3 w-2/5 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
		</div>
	{/if}
</div>
