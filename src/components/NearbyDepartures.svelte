<script lang="ts">
	let stops_table: Record<string, Record<string, any>> = {};
	let departure_list: any[] = [];

	export let usunits: boolean = false;
	export let darkMode: boolean = true;

	import { onMount } from 'svelte';
	import { writable, get } from 'svelte/store';
	import { _ } from 'svelte-i18n';
	import DelayDiff from './DelayDiff.svelte';
	import TimeDiff from './TimeDiff.svelte';
	import type { Writable } from 'svelte/store';

	const onbutton = "bg-blue-500 bg-opacity-80";

	const offbutton = "";

    const TIME_CUTOFF = 20000;
	const TIME_PREVIOUS_CUTOFF = 10 * 60;

	function sort_directions_group(x: any): [[string, any]] {
		let array = x;

		array.sort((a, b) => a[1].headsign.localeCompare(b[1].headsign));

		//console.log('sorted dep now ', array);

		return array;
	}


	setInterval(() => {
		current_time = Date.now();
	}, 300);

	import {
		ui_theme_store,
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
		nearby_deps_cache_gps,
		nearby_departures_filter
	} from '../globalstores';

	
	function filter_for_route_type(route_id: number, nearby_departures_filter_local: NearbySelectionFilterRouteType) {
		console.log('filtering for route id', route_id, nearby_departures_filter_local);

		if (route_id == 3 || route_id == 11) {
			if (nearby_departures_filter_local.bus == true) {
			return true;
			} else {
				return false;
			}
		}

		if ([0,1,5,7,12].includes(route_id)) {
			if (nearby_departures_filter_local.metro == true) {
				return true;
			} else {
				return false;
			}
		}

		
		if ((route_id == 2)) {
			if (nearby_departures_filter_local.rail == true) {
				return true;
			} else {
				return false;
			}
		}

		return true;
	}


	import type {
		NearbySelectionFilterRouteType} from "../globalstores";
	import { SingleTrip, StackInterface } from './stackenum';
	import { t } from 'svelte-i18n';
	import {
		fixHeadsignText,
		fixRouteName,
		fixRouteNameLong,
		fixStationName
	} from './agencyspecific';
	import { titleCase } from '../utils/titleCase';
	import { lightenColour } from './lightenDarkColour';

	
	let nearby_departures_filter_local = {
		rail: true,
		bus: true,
		metro: true,
		other: true
	};

	let departure_list_filtered = [];

	let nearby_rail_show = nearby_departures_filter_local.rail;
	let nearby_bus_show = nearby_departures_filter_local.bus;
	let nearby_metro_show = nearby_departures_filter_local.metro;
	let nearby_other_show = nearby_departures_filter_local.other;

	nearby_departures_filter.subscribe((x) => {
		nearby_departures_filter_local = get(nearby_departures_filter);
		nearby_rail_show = x.rail;
		nearby_bus_show = x.bus;
		nearby_metro_show = x.metro;
		nearby_other_show = x.other;
		refilter();
	});

	function refilter() {
		departure_list_filtered = departure_list.filter((x) => x.chateau_id != "greyhound~flix")
		.filter((x) => Object.keys(x.directions).length > 0)
		.filter((x) => filter_for_route_type(x.route_type, nearby_departures_filter_local));
	}

	let current_time: number = 0;

	let first_load = false;

	let first_attempt_sent = false;

	let timeout_first_attempt: NodeJS.Timeout | null = null;

	let loading = false;

	export let window_height_known: number =   500;

	let show_filter_menu:bool = false;

	onMount(() => {
		if (typeof window != "undefined") {
		current_time = Date.now();
	}

		window.addEventListener('resize', () => {
			window_height_known = window.innerHeight;
		});

		window_height_known = window.innerHeight;

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

		timeout_first_attempt = setInterval(() => {
			if (!first_attempt_sent) {
				getNearbyDepartures();
			} else {
				if (timeout_first_attempt != null) {
					clearInterval(timeout_first_attempt);
				}
			}
		}, 300);

		return () => {
			clearInterval(interval);

			if (timeout_first_attempt != null) {
				clearInterval(timeout_first_attempt);
			}
		};
	});

	async function getNearbyDepartures() {
		loading = true;

		let geolocation_of_user = get(geolocation_store);

		if (geolocation_of_user) {
			first_attempt_sent = true;

			let url = `https://birch.catenarymaps.org/nearbydeparturesfromcoords?lat=${geolocation_of_user?.coords.latitude}&lon=${geolocation_of_user?.coords.longitude}`;

			fetch(url)
				.then((response) => response.json())
				.then((data) => {
					stops_table = data.stop;
					let temp_departure_list = data.departures;

					temp_departure_list.forEach((route_group: any) => {
						let new_directions: Record<string, any> = {};

						Object.values(route_group.directions).forEach((direction: any) => {
							if (new_directions[direction.headsign]) {
								new_directions[direction.headsign].trips = [
									...new_directions[direction.headsign].trips,
									...direction.trips
								];
							} else {
								new_directions[direction.headsign] = direction;
							}
						});

						route_group.directions = new_directions;
					});

					departure_list = temp_departure_list;

					//console.log('nearby deps', departure_list);
					
					loading = false;

					refilter();

					nearby_deps_cache_gps.set(data);
				});
		}
	}
</script>

{#if current_time != 0}
<div class="flex flex-row mb-1">
	<h2 class={`${window_height_known < 600 ? 'text-lg' : ' text-lg md:text-xl mb-1'} font-medium text-gray-800 dark:text-gray-300 px-3  md:mb-2`}>
		<span class="material-symbols-outlined mr-1 translate-y-1 text-lg md:text-xl">near_me</span>
		{$_('nearbydepartures')}
	</h2>
	<div class='ml-auto pr-2'>
		<button
		on:click={() => {
			show_filter_menu = !show_filter_menu;
		}}
		 class="px-1 py-1 rounded-full bg-gray-300 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
			<span class="material-symbols-outlined translate-y-1">filter_alt</span>
	</button>
	</div>
</div>

{#if !first_attempt_sent}
	<p class="italic px-3 pb-2">Waiting for GPS...</p>
{/if}

<div class="w-full">
	{#if loading}
		<div class="h-1 w-full bg-sky-200 dark:bg-sky-900 overflow-hidden">
			<div class="progress w-full h-full bg-seashore left-right"></div>
		</div>
	{:else}
		<div class="h-1"></div>
	{/if}
</div>

{#if show_filter_menu}
<div class="py-2 px-3 flex flex-row gap-x-2">
	<button
	on:click={() => {
		nearby_departures_filter.update((x) => {return {...x, rail: !x.rail}});
		refilter();
	}}
	 class={`px-2 rounded-full border-black dark:border-white border-2 ${ nearby_rail_show == true ? onbutton : ""}`}>{$_("headingIntercityRail")}</button>

	 <button
	on:click={() => {
		nearby_departures_filter.update((x) => {return {...x, metro: !x.metro}});
		refilter();
	}}
	 class={`px-2 rounded-full border-black dark:border-white  border-2  ${ nearby_metro_show == true ? onbutton : ""}`}>{$_("headingLocalRail")}</button>

	 <button
	on:click={() => {
		nearby_departures_filter.update((x) => {return {...x, bus: !x.bus}});
		refilter();
	}}
	 class={`px-2 rounded-full border-black dark:border-white  border-2  ${ nearby_bus_show == true  ? onbutton : ""}`}>{$_("headingBus")}</button>

	 <button
	 on:click={() => {
		 nearby_departures_filter.update((x) => {return {...x, other: !x.other}});
		 refilter();
	 }}
	  class={`px-2 rounded-full border-black dark:border-white border-2  ${ nearby_other_show == true ? onbutton : ""}`}>{$_("headingOther")}</button>
</div>
{/if}

<div class=" catenary-scroll overflow-y-auto pb-64 h-full">
	<div class="flex flex-col">
		{#each departure_list_filtered as route_group}
			<div class={`${window_height_known < 600 ? 'mt-0 mb-1' : 'mt-1 mb-2'} px-3 mx-3 py-2 bg-gray-100 dark:bg-background rounded-md`}>
				<p class={`${window_height_known < 600 ? 'text-lg' : 'text-lg'}`} style={`color: ${darkMode ? lightenColour(route_group.color) : route_group.color}`}>
					{#if route_group.short_name}
						<span class="font-bold mr-1"
							>{fixRouteName(
								route_group.chateau_id,
								route_group.short_name,
								route_group.route_id
							)}</span
						>
					{/if}

					{#if route_group.long_name}
						<span class="font-medium"
							>{fixRouteNameLong(
								route_group.chateau_id,
								route_group.long_name,
								route_group.route_id
							)}</span
						>
					{/if}
				</p>

				{#each sort_directions_group(Object.entries(route_group.directions)) as [d_id, direction_group]}
					{#if direction_group.trips.filter((x) => (x.departure_realtime || x.departure_schedule) > Date.now() / 1000 - TIME_PREVIOUS_CUTOFF && (x.departure_realtime || x.departure_schedule) < Date.now() / 1000 + TIME_CUTOFF).length > 0}
						<p class="font-medium -translate-x-1 mt-1 md:mt-3 mb-1">
							<span class="material-symbols-outlined text-md align-middle -translate-y-0.5"
								>chevron_right</span
							>
							{titleCase(fixHeadsignText(direction_group.headsign, route_group.route_id))}
							<span class="text-sm bg-white dark:bg-darksky inline-block px-1 rounded-sm -translate-y-0.5 ml-1">
								<span class="material-symbols-outlined !text-sm align-middle">distance</span>
								{fixStationName(
									stops_table[route_group.chateau_id][direction_group.trips[0].stop_id].name
								)}</span
							>
						</p>
					{/if}
					<div class="flex flex-row gap-x-1 overflow-x-auto catenary-scroll">
						{#each direction_group.trips.filter((x) => (x.departure_realtime || x.departure_schedule) > Date.now() / 1000 - TIME_PREVIOUS_CUTOFF && (x.departure_realtime || x.departure_schedule) < Date.now() / 1000 + TIME_CUTOFF).sort((a, b) => (a.departure_realtime || a.departure_schedule) > (b.departure_realtime || b.departure_schedule)) as trip}
							<div
								class="bg-white dark:bg-darksky hover:bg-blue-100 hover:dark:bg-hover p-0.5 mb-1 rounded-sm min-w-24 flex justify-center"
								on:click={() => {
									data_stack_store.update((stack) => {
										stack.push(
											new StackInterface(
												new SingleTrip(
													route_group.chateau_id,
													trip.trip_id,
													route_group.route_id,
													null,
													trip.gtfs_schedule_start_day.replace(/-/g, ''),
													null,
													route_group.route_type
												)
											)
										);

										return stack;
									});
								}}
							>
								<div class="text-center leading-none md:leading-tight">
									{#if route_group.route_type == 2 && trip.trip_short_name}
										<p class="text-md inline-block font-medium px-1 rounded-sm" style:background-color={route_group.color} style:color={route_group.text_color}>{trip.trip_short_name}</p><br />
									{/if}

									<span
										class={`font-semibold ${(trip.departure_realtime || trip.departure_schedule) - current_time / 1000 < -60 ?  "text-gray-600 dark:text-gray-400" : (trip.departure_realtime ? 'text-[#42a7c5]' : '')}`}
									>
										{#if (trip.departure_realtime || trip.departure_schedule) - current_time / 1000 > 60 || (trip.departure_realtime || trip.departure_schedule) - current_time / 1000 < -60}
											<TimeDiff
												large={false}
												show_brackets={false}
												show_seconds={false}
												diff={(trip.departure_realtime || trip.departure_schedule) -
													current_time / 1000}
											/>
										{:else}
											<span class="text-md font-bold">{$_('now')}</span>
										{/if}
										{#if trip.departure_realtime}
											<svg
												class="inline ml-0.5 w-4 h-4 -translate-y-0.5"
												height="24"
												viewBox="0 -960 960 960"
												width="24"
												fill={'#42a7c5'}
												><path
													d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z"
												/></svg
											>
										{:else}
											<svg
												class="inline ml-0.5 w-3 h-3"
												height="24"
												viewBox="0 -960 960 960"
												width="24"
												fill={darkMode ? 'white' : 'black'}
												><path
													d="M440-120v-264L254-197l-57-57 187-186H120v-80h264L197-706l57-57 186 187v-264h80v264l186-187 57 57-187 186h264v80H576l187 186-57 57-186-187v264h-80Z"
												/></svg
											>
										{/if}
									</span>

									<p class="font-medium text-sm" style:color={trip.departure_realtime ? '#42a7c5': ''}>
										{new Intl.DateTimeFormat('en-GB', {
											hour: 'numeric',
											minute: 'numeric',
											timeZone: stops_table[route_group.chateau_id][direction_group.trips[0].stop_id].timezone || trip.tz
										}).format(
											new Date((trip.departure_realtime || trip.departure_schedule) * 1000)
										)}
									</p>

									{#if trip.cancelled}
										<span class="text-red-500">{$_('cancelled')}</span>
									{/if}

									{#if trip.departure_realtime != null && trip.departure_schedule != null}
										<DelayDiff
											show_seconds={false}
											diff={trip.departure_realtime - trip.departure_schedule}
										/>
									{/if}

									{#if trip.platform}
										<p class="text-xs text-gray-800 dark:text-gray-200">
											{trip.platform}
										</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>

{/if}