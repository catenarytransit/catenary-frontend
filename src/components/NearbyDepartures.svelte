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
	import * as maplibregl from 'maplibre-gl';

	const onbutton = 'bg-blue-300 dark:bg-blue-500 bg-opacity-80';

	const offbutton = '';

	const TIME_CUTOFF = 64800;
	const TIME_PREVIOUS_CUTOFF = 10 * 60;

	function sort_directions_group(x: any): [[string, any]] {
		let array = x;

		array.sort((a, b) => a[1].headsign.localeCompare(b[1].headsign));

		//console.log('sorted dep now ', array);

		return array;
	}

	setInterval(() => {
		current_time = Date.now();
	}, 500);

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
		nearby_departures_filter,
		nearby_pick_state_store,
		nearby_user_picks_store
	} from '../globalstores';

	import type { UserPicksNearby } from '../globalstores';

	let current_nearby_pick_state = get(nearby_pick_state_store);

	nearby_pick_state_store.subscribe((x) => {
		current_nearby_pick_state = x;
	});

	function filter_for_route_type(
		route_type: number,
		nearby_departures_filter_local: NearbySelectionFilterRouteType
	) {
		//console.log('filtering for route type', route_type, nearby_departures_filter_local);

		if ([3, 11, 700].includes(route_type)) {
			if (nearby_departures_filter_local.bus == true) {
				return true;
			} else {
				return false;
			}
		}

		if ([0, 1, 5, 7, 12, 900].includes(route_type)) {
			if (nearby_departures_filter_local.metro == true) {
				return true;
			} else {
				return false;
			}
		}

		if ([2, 106, 107, 101, 100, 102, 103].includes(route_type)) {
			if (nearby_departures_filter_local.rail == true) {
				return true;
			} else {
				return false;
			}
		}

		return true;
	}

	import type { NearbySelectionFilterRouteType } from '../globalstores';
	import { SingleTrip, StackInterface, StopStack, RouteStack } from './stackenum';
	import jsonwebworkerpkg from '@cheprasov/json-web-worker';
	const { jsonWebWorker, parse, stringify } = jsonwebworkerpkg;
	import { t } from 'svelte-i18n';
	import {
		fixHeadsignText,
		fixRouteName,
		fixRouteNameLong,
		fixStationName
	} from './agencyspecific';
	import { titleCase } from '../utils/titleCase';
	import { lightenColour } from './lightenDarkColour';

	let nearby_departures_filter_local = { rail: true, bus: true, metro: true, other: true };

	let departure_list_filtered = [];

	let nearby_rail_show = nearby_departures_filter_local.rail;
	let nearby_bus_show = nearby_departures_filter_local.bus;
	let nearby_metro_show = nearby_departures_filter_local.metro;
	let nearby_other_show = nearby_departures_filter_local.other;

	let abort_controller: AbortController | null = null;

	nearby_departures_filter.subscribe((x) => {
		nearby_departures_filter_local = get(nearby_departures_filter);
		nearby_rail_show = x.rail;
		nearby_bus_show = x.bus;
		nearby_metro_show = x.metro;
		nearby_other_show = x.other;
		refilter();
	});

	function refilter() {
		departure_list_filtered = departure_list.filter(x => 
			Object.keys(x.directions).length > 0 && 
			filter_for_route_type(x.route_type, nearby_departures_filter_local)
		);
		
		console.log('filtered departures', departure_list_filtered.length);
	}

	let current_time: number = 0;

	let first_load = false;

	let first_attempt_sent = false;

	let timeout_first_attempt: NodeJS.Timeout | null = null;

	let loading = false;

	let marker_reference: maplibregl.Marker | null = null;

	let amount_of_ms_total_server_side: number | null = null;

	export let window_height_known: number = 500;

	let show_filter_menu: boolean = false;

	onMount(() => {
		if (typeof window != 'undefined') {
			current_time = Date.now();
		}

		if (current_nearby_pick_state == 1) {
			let map = get(map_pointer_store);

			if (map) {
				let marker_info = get(nearby_user_picks_store);

				if (marker_reference == null) {
					marker_reference = new maplibregl.Marker({ color: '#ac46ff', draggable: true })
						.setLngLat([marker_info?.longitude, marker_info?.latitude])
						.addTo(map);

					marker_reference.on('dragend', onDragEnd);
				}
			}
		}

		window.addEventListener('resize', () => {
			window_height_known = window.innerHeight;
		});

		window_height_known = window.innerHeight;

		if (current_nearby_pick_state == 0) {
			let hit_nearby_deps_cache = get(nearby_deps_cache_gps);

			if (hit_nearby_deps_cache) {
				stops_table = hit_nearby_deps_cache.stop;
				departure_list = hit_nearby_deps_cache.departures;
			}

			refilter();
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

			if (marker_reference) {
				marker_reference.remove();
			}
		};
	});

	function my_location_press() {
		nearby_pick_state_store.set(0);

		getNearbyDepartures();
	}

	function pin_drop_press() {
		nearby_pick_state_store.set(1);

		//get map centre
		let map = get(map_pointer_store);

		if (map) {
			let centre = map.getCenter();

			if (marker_reference == null) {
				makeNewMarker();
			}

			getNearbyDepartures();
		}
	}

	function onDragEnd() {
		if (marker_reference) {
			const lngLat = marker_reference.getLngLat();

			nearby_user_picks_store.set({ latitude: lngLat.lat, longitude: lngLat.lng });

			getNearbyDepartures();
		}
	}

	function makeNewMarker() {
		let map = get(map_pointer_store);

		if (map) {
			let centre = map.getCenter();

			if (marker_reference == null) {
				marker_reference = new maplibregl.Marker({ color: '#ac46ff', draggable: true })
					.setLngLat([centre.lng, centre.lat])
					.addTo(map);

				const lngLat = marker_reference.getLngLat();

				nearby_user_picks_store.set({ latitude: lngLat.lat, longitude: lngLat.lng });

				marker_reference.on('dragend', onDragEnd);
			}
		}
	}

	function centre_press() {
		//get map centre
		let map = get(map_pointer_store);

		if (map) {
			let centre = map.getCenter();

			if (marker_reference == null) {
				makeNewMarker();
			}

			marker_reference.setLngLat([centre.lng, centre.lat]);

			nearby_user_picks_store.set({ latitude: centre.lat, longitude: centre.lng });
		}

		pin_drop_press();
	}

	async function getNearbyDepartures() {
		loading = true;

		let query_type = get(nearby_pick_state_store);

		let geolocation_of_user = get(geolocation_store);

		let lat = 0;
		let lng = 0;

		if (query_type == 1) {
			let user_picks = get(nearby_user_picks_store);

			if (user_picks != null) {
				lat = user_picks.latitude;
				lng = user_picks.longitude;
			}
		}

		if (query_type == 0) {
			if (geolocation_of_user) {
				lat = geolocation_of_user.coords.latitude;
				lng = geolocation_of_user.coords.longitude;
			}
		}

		if (lat != 0 && lng != 0) {
			first_attempt_sent = true;

			let url = `https://birch.catenarymaps.org/nearbydeparturesfromcoords?lat=${lat}&lon=${lng}`;

			if (abort_controller) {
				abort_controller.abort();
			}

			abort_controller = new AbortController();

			let signal = abort_controller.signal;

			fetch(url, { signal: signal })
				.then((response) => response.text())
				.then((text) => jsonWebWorker.parse(text))
				.then((data) => {
					stops_table = data.stop;
					let temp_departure_list = data.departures;

					amount_of_ms_total_server_side = data.debug.total_time_ms;

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

						//for each value in the directions object

						for (const [key, value] of Object.entries(new_directions)) {
							//sort the trips by departure time in place
							new_directions[key].trips.sort(
								(a: any, b: any) =>
									(a.departure_realtime || a.departure_schedule) -
									(b.departure_realtime || b.departure_schedule)
							);
						}

						route_group.directions = new_directions;
					});

					departure_list = temp_departure_list;

					//console.log('nearby deps', departure_list);

					loading = false;
					refilter();

					if (query_type == 0) {
						nearby_deps_cache_gps.set(data);
					}
				});
		}
	}
</script>

{#if current_time != 0}
	<div class="flex flex-row mb-0.5 md:mb-1">
		<div class="flex flex-row gap-x-1 pl-3">
			<div
				on:click={() => {
					my_location_press();
				}}
				class={`border-2 ${current_nearby_pick_state == 0 ? 'bg-green-200 dark:bg-green-800' : ''} rounded-lg border-green-500 px-1.5 py-1`}
			>
				<span class="material-symbols-outlined mx-auto translate-y-1 text-sm">near_me</span>
			</div>

			<div
				class={`border-2  ${current_nearby_pick_state == 1 ? 'bg-purple-200 dark:bg-purple-800 ' : ''} 
	rounded-lg border-purple-500 flex flex-row`}
			>
				<div
					class="px-2 py-0.5 border-r border-gray-500 flex flex-row"
					on:click={() => {
						pin_drop_press();
					}}
				>
					<span class="material-symbols-outlined mx-auto translate-y-1 text-sm">pin_drop</span>
				</div>

				<div
					class="px-2 py-0.5 flex flex-row"
					on:click={() => {
						centre_press();
					}}
				>
					<span class="material-symbols-outlined mx-auto translate-y-1 text-sm"
						>center_focus_strong</span
					>
				</div>
			</div>
		</div>

		{#if amount_of_ms_total_server_side != null}
			<div class="align-middle ml-1 my-auto">
				<p class="text-gray-800 dark:text-gray-300 text-sm">{amount_of_ms_total_server_side} ms</p>
			</div>
		{/if}
		<!--
<h2 class={`${window_height_known < 600 ? 'text-lg' : ' text-lg md:text-xl mb-1'} font-medium text-gray-800 dark:text-gray-300 px-3 `}>
		{$_('nearbydepartures')}
	</h2>
	-->
		<div class="ml-auto pr-2">
			<button
				on:click={() => {
					show_filter_menu = !show_filter_menu;
				}}
				class="px-1 py-1 rounded-full bg-gray-300 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
			>
				<span class="material-symbols-outlined translate-y-1">filter_alt</span>
			</button>
		</div>
	</div>

	{#if !first_attempt_sent && current_nearby_pick_state == 0}
		<p class="italic px-3 pb-2">{$_("waitingforgps")}...</p>
		<p class="italic px-3 pt-1 text-xs">{$_("gpsdisclaimer")}</p>
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
		<div class="py-0.5 md:py-2 px-3 flex flex-row gap-x-2 text-sm md:text-base">
			<button
				on:click={() => {
					nearby_departures_filter.update((x) => {
						return { ...x, rail: !x.rail };
					});
					refilter();
				}}
				class={`px-2 rounded-full border-black dark:border-white border-2 ${nearby_rail_show == true ? onbutton : ''}`}
				>{$_('headingIntercityRail')}</button
			>

			<button
				on:click={() => {
					nearby_departures_filter.update((x) => {
						return { ...x, metro: !x.metro };
					});
					refilter();
				}}
				class={`px-2 rounded-full border-black dark:border-white  border-2  ${nearby_metro_show == true ? onbutton : ''}`}
				>{$_('headingLocalRail')}</button
			>

			<button
				on:click={() => {
					nearby_departures_filter.update((x) => {
						return { ...x, bus: !x.bus };
					});
					refilter();
				}}
				class={`px-2 rounded-full border-black dark:border-white  border-2  ${nearby_bus_show == true ? onbutton : ''} `}
				>{$_('headingBus')}</button
			>

			<button
				on:click={() => {
					nearby_departures_filter.update((x) => {
						return { ...x, other: !x.other };
					});
					refilter();
				}}
				class={`px-2 rounded-full border-black dark:border-white border-2  ${nearby_other_show == true ? onbutton : ''}`}
				>{$_('headingOther')}</button
			>
		</div>
	{/if}

	<div class=" catenary-scroll overflow-y-auto pb-64 h-full">
		<div class="flex flex-col">
			{#each departure_list_filtered as route_group}
				<div
					class={`${window_height_known < 600 ? 'mt-0 mb-1' : 'mt-1 mb-1 mb:mb-2'} px-1 mx-1 py-1 md:py-2 bg-gray-100 dark:bg-background rounded-md dark:bg-opacity-50`}
				>
					<p
						class={`${window_height_known < 600 ? 'text-lg' : 'text-lg'} ml-1 underline decoration-sky-500/80 hover:decoration-sky-500 cursor-pointer`}
						style={`color: ${darkMode ? lightenColour(route_group.color) : route_group.color}`}
						on:click={() => {
									data_stack_store.update((stack) => {
										stack.push(
											new StackInterface(
												new RouteStack(route_group.chateau_id, route_group.route_id)
									)
										);

										return stack;
									});
								}}
					>
						{#if route_group.short_name}
							<span class="font-bold mr-1  "
								
							>
								{fixRouteName(
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
							<p class="font-medium -translate-x-1 mt-1 mb-1 leading-tight">
								<span class="material-symbols-outlined text-md align-middle -translate-y-0.5"
									>chevron_right</span
								>
								{titleCase(fixHeadsignText(direction_group.headsign, route_group.route_id))}
								<span
									on:click={() => {
										data_stack_store.update((stack) => {
											stack.push(
												new StackInterface(
													new StopStack(route_group.chateau_id, direction_group.trips[0].stop_id)
												)
											);

											return stack;
										});
									}}
									class="text-sm bg-white dark:bg-darksky inline-block px-1 rounded-sm -translate-y-0.5 ml-1"
								>
									<span class="material-symbols-outlined !text-sm align-middle">distance</span>
									{fixStationName(
										stops_table[route_group.chateau_id][direction_group.trips[0].stop_id].name
									)}</span
								>
							</p>
						{/if}
						<div class="flex flex-row gap-x-1 overflow-x-auto catenary-scroll">
							{#each direction_group.trips.filter((x) => (x.departure_realtime || x.departure_schedule) > Date.now() / 1000 - TIME_PREVIOUS_CUTOFF && (x.departure_realtime || x.departure_schedule) < Date.now() / 1000 + TIME_CUTOFF) as trip}
								<button
									aria-label={`Go to ${fixHeadsignText(direction_group.headsign, route_group.route_id)} at ${fixStationName(
										stops_table[route_group.chateau_id][direction_group.trips[0].stop_id].name
									)} at ${new Intl.DateTimeFormat('en-GB', {
										hour: 'numeric',
										minute: 'numeric',
										timeZone:
											stops_table[route_group.chateau_id][direction_group.trips[0].stop_id]
												.timezone || trip.tz
									}).format(
										new Date((trip.departure_realtime || trip.departure_schedule) * 1000)
									)}`}
									class="bg-white dark:bg-darksky hover:bg-blue-100 hover:dark:bg-hover p-0.5 mb-1 rounded-sm min-w-20 flex justify-center"
									on:click={() => {
										data_stack_store.update((stack) => {
											stack.push(
												new StackInterface(
													new SingleTrip(
														route_group.chateau_id,
														trip.trip_id,
														route_group.route_id,
														trip.gtfs_frequency_start_time,
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
									<div class="text-center">
										{#if [2, 4].includes(route_group.route_type) && trip.trip_short_name}
											<p
												class=" {trip.trip_short_name.length > 10
													? 'text-sm font-regular'
													: 'font-medium'} px-1 rounded-sm leading-none md:leading-tight"
												style:background-color={route_group.color}
												style:color={route_group.text_color}
											>
												{trip.trip_short_name}
											</p>
										{/if}

										<span
											class={`font-semibold ${(trip.departure_realtime || trip.departure_schedule) - current_time / 1000 < -60 ? 'text-gray-600 dark:text-gray-400' : trip.departure_realtime ? 'text-seashore dark:text-seashoredark' : ''}`}
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
													class="dark:hidden inline ml-0.5 w-4 h-4 -translate-y-0.5"
													height="24"
													viewBox="0 -960 960 960"
													width="24"
													fill={'var(--color-seashore)'}
													><path
														d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z"
													/></svg
												>
												<svg
													class="hidden dark:inline ml-0.5 w-4 h-4 -translate-y-0.5"
													height="24"
													viewBox="0 -960 960 960"
													width="24"
													fill={'var(--color-seashoredark)'}
													><path
														d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z"
													/></svg
												>
											{/if}
										</span>

										<p
											class="font-medium text-sm leading-none"
										>
											{new Intl.DateTimeFormat('en-GB', {
												hour: 'numeric',
												minute: 'numeric',
												timeZone:
													stops_table[route_group.chateau_id][direction_group.trips[0].stop_id]
														.timezone || trip.tz
											}).format(
												new Date((trip.departure_realtime || trip.departure_schedule) * 1000)
											)}
										</p>

										{#if trip.cancelled}
											<p class="text-red-500 leading-none md:leading-tight">{$_('cancelled')}</p>
										{/if}

										{#if trip.deleted}
											<p class="text-red-500 leading-none md:leading-tight">{$_('deleted')}</p>
										{/if}

										{#if trip.departure_realtime != null && trip.departure_schedule != null}
											<p class="leading-none">
												<DelayDiff
													show_seconds={false}
													diff={trip.departure_realtime - trip.departure_schedule}
												/>
											</p>
										{/if}

										{#if trip.platform}
											<p
												class="text-xs text-gray-800 dark:text-gray-200 leading-none md:leading-tight"
											>
												{$_('platform')}
												{trip.platform.replace('Track', '').trim()}
											</p>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					{/each}
				</div>
			{/each}
		</div>

		{#if departure_list_filtered.length == 0 && first_load == true && !loading}
			<br />

			<p>No departures.</p>

			<img src="/premium_photo-1671611799147-68a4f9b3f0e1.avif" alt="No departures found" />
		{/if}

		<!--Testing advert
	<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2140162638544192"
		crossorigin="anonymous"></script>

		
		<p class='ml-2 hidden md:block'>Advert:</p>
	
	<div class={`w-full overflow-x-clip ${darkMode ? "hidden md:block" : "hidden"}`}>
	
   <ins class="adsbygoogle"
		style="display:block"
		data-ad-format="fluid"
		data-ad-layout-key="-gw-3+1f-3d+2z"
		data-ad-client="ca-pub-2140162638544192"
		data-ad-slot="9693813767"></ins>
	</div>

	<div  class={`w-full overflow-x-clip ${darkMode ? "hidden" : "hidden md:block"}`}>
<ins class="adsbygoogle"
     style="display:block"
     data-ad-format="fluid"
     data-ad-layout-key="-gw-3+1f-3d+2z"
     data-ad-client="ca-pub-2140162638544192"
     data-ad-slot="3466257276"></ins>

	</div>

	-->

		<script>
			//	(adsbygoogle = window.adsbygoogle || []).push({});
		</script>
	</div>
{/if}
