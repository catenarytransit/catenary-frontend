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
	import AlertBox from './serviceAlerts.svelte';
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
		show_gtfs_ids_store,
		custom_icons_category_to_layer_id,
		map_pointer_store,

		stops_to_hide_store

	} from '../globalstores';
	import RouteHeading from './RouteHeading.svelte';
	import { determineDarkModeToBool } from './determineDarkModeToBool';
	import NativeLands from './NativeLands.svelte';
	import { refilter_stops,delete_filter_stops_background } from './makeFiltersForStop';

	let activePattern: string = '';

	let show_gtfs_ids = get(show_gtfs_ids_store);

	show_gtfs_ids_store.subscribe((value) => {
		show_gtfs_ids = value;
	});

	let stop_id_to_alert_ids: Record<string, string[]> = {};

	let alerts: Record<string, any> = {};

	export let routestack: RouteStack;

	export let darkMode: boolean = determineDarkModeToBool();

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

	function change_active_pattern(pattern: string) {
		activePattern = pattern;

		const map = get(map_pointer_store);

		let shape_id = route_data.direction_patterns[pattern].direction_pattern.gtfs_shape_id;

		console.log('shapeid', shape_id);

		if (shape_id) {
			if (route_data.shapes_polyline[shape_id]) {
				let geojson_polyline_geo = polyline.toGeoJSON(route_data.shapes_polyline[shape_id], 6);

						let geojson_polyline = {
							geometry: geojson_polyline_geo,
							type: 'Feature',
							properties: {
								text_color: route_data.text_color,
								color: route_data.color,
								route_label: route_data.route_short_name || route_data.route_long_name,
							}
						};

						let geojson_source_new = {
							type: 'FeatureCollection',
							features: [geojson_polyline]
						};

		map.getSource('transit_shape_context').setData(geojson_source_new);
			}

			//now work on stops

			let already_seen_stop_ids: string[] = [];

							let stops_features = route_data.direction_patterns[pattern].rows
							.filter((eachstoptime: any) => {
								if (already_seen_stop_ids.indexOf(eachstoptime.stop_id) === -1) {
									already_seen_stop_ids.push(eachstoptime.stop_id);
									return true;
								}
								return false;
							})
							.map((eachstoptime: any) => {
								return {
									type: 'Feature',
									properties: {
										label: route_data.stops[eachstoptime.stop_id].name
												.replace('Station ', '')
												.replace(' Station', '')
												.replace(', Bahnhof', '')
												.replace(' Banhhof', '')
												.replace('Estación de tren ', '')
												.replace(' Metrolink', '')
												.replace('Northbound', 'N.B.')
												.replace('Eastbound', 'E.B.')
												.replace('Southbound', 'S.B.')
												.replace('Westbound', 'W.B.')
												.replace(' (Railway) ', '')
												.replace(' Light Rail', '')
												.replace(" Amtrak", "")
												.replace(" Transportation Center", ""),
										stop_id: eachstoptime.stop_id,
										chateau: eachstoptime.chateau_id,
										stop_route_type: route_data.route_type,
									},
									geometry: {
										coordinates: [route_data.stops[eachstoptime.stop_id].longitude, route_data.stops[eachstoptime.stop_id].latitude],
										type: 'Point'
									}
								};
							});

							let stop_source_new = {
								type: 'FeatureCollection',
								features: stops_features
							};

							map.getSource('stops_context').setData(stop_source_new);

							//hide from background

							stops_to_hide_store.set(
								{
									[route_data.chateau_id]: route_data.direction_patterns[pattern].rows.map((eachstoptime: any) => eachstoptime.stop_id)
								}
							);

							refilter_stops();
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
			`https://birch.catenarymaps.org/route_info?chateau=${routestack.chateau_id}&route_id=${encodeURIComponent(routestack.route_id.replace(/^\"/, "").replace(/\"$/, ""))}`
		);

		await fetch(url.toString()).then(async (response) => {
			let text = await response.text();
			try {
				const data = JSON.parse(text);
				console.log('route data', data);
				loaded = true;

				route_data = data;

				alerts = data.alert_id_to_alert;

				Object.keys(alerts).forEach((alert_id) => {
						let alert = alerts[alert_id];
						alert.informed_entity.forEach((each_entity: any) => {
							if (each_entity.stop_id) {
								if (stop_id_to_alert_ids[each_entity.stop_id] == undefined) {
									stop_id_to_alert_ids[each_entity.stop_id] = [alert_id];
								} else {
									stop_id_to_alert_ids[each_entity.stop_id].push(alert_id);
								}
							}
						});
					});

				change_active_pattern(Object.keys(route_data.direction_patterns)[0]);
			} catch (err) {
				console.error(err);
			}
		});
	}

	$: if (routestack) {
		fetch_route_selected();
	}

	onMount(() => {

		delete_filter_stops_background();
	})

</script>

{#if loaded == true}
	<div class=" catenary-scroll overflow-y-auto grow"
	bind:this={bind_scrolling_div}>
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

		{
			#if show_gtfs_ids
		}
			<div class="font-mono px-3">
				<div class="text-sm font-mono text-gray-500 dark:text-gray-400">
					Chateau: <span class="font-bold">{routestack.chateau_id}</span>
					<br/>
					Route: <span class="font-bold">{routestack.route_id.replace(/^\"/, "").replace(/\"$/, "")}</span>
				</div>

			</div>
			{/if}

		<div class="px-2"><AlertBox alerts={alerts}/></div>

		

		<p class="px-3 text-xl my-1">Directions</p>
		<div class="flex flex-col mr-2 ml-2">
			{#each Object.entries(route_data.direction_patterns).sort((a,b) => (a[1].direction_pattern.headsign_or_destination < b[1].direction_pattern.headsign_or_destination)) as direction, index}
				<div
					on:click={() => (change_active_pattern(direction[1].direction_pattern.direction_pattern_id))}
					class={`border border-gray-500 py-1 px-1 text-sm  hover:bg-seashore flex rounded-md min-w-36  leading-tight ${direction[1].direction_pattern.direction_pattern_id == activePattern ? 'bg-seashore' : 'bg-white dark:bg-slate-800'}`}
				>
					<p>
						<span>{titleCase(direction[1].direction_pattern.headsign_or_destination)}</span>
					<span class="text-xs">{" ("}{direction[1].rows.length}{" "}{$_("stops")}{" )"}</span>
					</p>
				</div>
			{/each}
		</div>
		<div
			class="grow pt-2 flex flex-col"
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
							class={`absolute top-[10px] bottom-1/2 left-2.5 w-3 h-3 rounded-full bg-white z-30 border-2`}
							style:border-color={route_data.color}
						></div>
						<span class="text-sm relative ml-[16px] translate-y-px"
							>{fixStationName(route_data.stops[stop.stop_id].name)}</span
						>
						{#if stop.code} 
						<span class="text-sm relative ml-0 translate-y-px font-light"
							>{fixStationName(route_data.stops[stop.stop_id].code)}</span
						>
						{/if}
						{#if show_gtfs_ids}
							<span class="text-xs text-gray-600 dark:text-gray-200 bg-blue-200 dark:bg-blue-900">{stop.stop_id}</span>
						{/if}
					</span>
				{/each}
			{/if}

			<br/>

			<NativeLands chateau={routestack.chateau_id} />

			<br/>
		</div>
	</div>
	{:else}
		<div class="w-full p-2 flex flex-col gap-y-2">
			<div class="h-5 w-1/2 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
			<div class="h-3 w-1/4 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
			<div class="h-3 w-2/5 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
		</div>
	{/if}
