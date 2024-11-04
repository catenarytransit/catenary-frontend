<script lang="ts">
	import { json } from '@sveltejs/kit';
	import { SingleTrip } from '../components/stackenum';
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

	export let window_height_known: number =  500;
	onMount(() => {
		window_height_known = window.innerHeight;

		
	window.addEventListener('resize', () => {
		window_height_known = window.innerHeight;
	});
	})


	export let usunits: boolean;

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
	import { hexToRgb } from '../utils/colour';

	let stop_id_to_alert_ids: Record<string, string[]> = {};

	let alerts: Record<string, any> = {};

	let last_inactive_stop_idx = -1;

	async function update_realtime_data() {
		let url = new URL(
			`https://birch.catenarymaps.org/get_trip_information_rt_update/${trip_selected.chateau_id}/`
		);

		if (trip_selected.trip_id != null) {
			url.searchParams.append('trip_id', trip_selected.trip_id);
		}

		if (trip_selected.start_date != null) {
			url.searchParams.append('start_date', trip_selected.start_date);
		}

		if (trip_selected.start_time != null) {
			url.searchParams.append('start_time', trip_selected.start_time);
		}

		await fetch(url.toString()).then(async (response) => {
			let text = await response.text();
			try {
				const rt_update_json = JSON.parse(text);
				console.log('rt trip data', rt_update_json);

				const data = rt_update_json.data;

				if (rt_update_json.found_data === true) {
					let next_stoptimes_cleaned: any[] = stoptimes_cleaned_dataset;

					let new_stop_times_queue = data.stoptimes;

					next_stoptimes_cleaned.forEach((existing_stop_time: any) => {
						let new_stop_time_to_use_idx = new_stop_times_queue.findIndex((new_stop_time: any) => {
							if (
								new_stop_time.gtfs_stop_sequence != null &&
								existing_stop_time.gtfs_stop_sequence != null
							) {
								let answer =
									new_stop_time.gtfs_stop_sequence == existing_stop_time.gtfs_stop_sequence;

								if (answer == true) {
									return answer;
								}
							}
							if (new_stop_time.gtfs_stop_id != null && existing_stop_time.gtfs_stop_id != null) {
								return new_stop_time.gtfs_stop_id == existing_stop_time.gtfs_stop_id;
							}

							return false;
						});

						if (new_stop_time_to_use_idx != -1) {
							let new_stop_time_to_use_arr = new_stop_times_queue.splice(
								new_stop_time_to_use_idx,
								1
							);
							let new_stop_time_data_to_use = new_stop_time_to_use_arr[0];

							existing_stop_time.rt_platform_string = new_stop_time_data_to_use.rt_platform_string;

							if (typeof new_stop_time_data_to_use.rt_arrival?.time == 'number') {
								existing_stop_time.rt_arrival_time = new_stop_time_data_to_use.rt_arrival?.time;
								existing_stop_time.strike_arrival = true;
							} else {
								existing_stop_time.rt_arrival_time = null;
								existing_stop_time.strike_arrival = false;
								existing_stop_time.rt_departure_diff = null;
							}

							if (typeof new_stop_time_data_to_use.rt_departure?.time == 'number') {
								existing_stop_time.rt_departure_time = new_stop_time_data_to_use.rt_departure?.time;
								existing_stop_time.strike_departure = true;
							} else {
								existing_stop_time.rt_departure_time = null;
								existing_stop_time.strike_departure = false;
								existing_stop_time.rt_arrival_diff = null;
							}

							if (typeof existing_stop_time.rt_departure_time == 'number') {
								if (existing_stop_time.scheduled_departure_time_unix_seconds) {
									existing_stop_time.rt_departure_diff =
										existing_stop_time.rt_departure_time -
										existing_stop_time.scheduled_departure_time_unix_seconds;
								}
							}

							if (typeof existing_stop_time.rt_arrival_time == 'number') {
								if (existing_stop_time.scheduled_arrival_time_unix_seconds) {
									existing_stop_time.rt_arrival_diff =
										existing_stop_time.rt_arrival_time -
										existing_stop_time.scheduled_arrival_time_unix_seconds;
								}

								if (typeof existing_stop_time.rt_departure_time == 'number') {
									if (existing_stop_time.rt_departure_time < existing_stop_time.rt_arrival_time) {
										existing_stop_time.rt_departure_time = existing_stop_time.rt_arrival_time;
										existing_stop_time.strike_departure = true;
									}
								} else {
									if (
										existing_stop_time.scheduled_departure_time_unix_seconds <
										existing_stop_time.rt_arrival_time
									) {
										existing_stop_time.rt_departure_time = existing_stop_time.rt_arrival_time;
										existing_stop_time.strike_departure = true;
									}
								}
							}
						}
					});

					stoptimes_cleaned_dataset = next_stoptimes_cleaned;
					init_loaded = Date.now();
					console.log('single trip rt update', stoptimes_cleaned_dataset);
				}
			} catch (e: any) {
				console.error(e);
			}
		});
	}

	onDestroy(() => {
		if (fetchtimeout != null) {
			clearInterval(fetchtimeout);
		}

		if (updatetimecounter != null) {
			clearInterval(updatetimecounter);
		}
	});

	export let trip_selected: SingleTrip;

	export let darkMode: boolean = false;

	async function fetch_trip_selected() {
		let map = get(map_pointer_store);

		console.log('t-s', trip_selected);

		let url = new URL(
			`https://birch.catenarymaps.org/get_trip_information/${trip_selected.chateau_id}/`
		);

		if (trip_selected.trip_id != null) {
			url.searchParams.append('trip_id', trip_selected.trip_id);
		}
		if (trip_selected.start_date != null) {
			url.searchParams.append('start_date', trip_selected.start_date);
		}

		if (trip_selected.start_time != null) {
			url.searchParams.append('start_time', trip_selected.start_time);
		}

		await fetch(url.toString())
			.then(async (response) => {
				let text = await response.text();
				try {
					const data = JSON.parse(text);
					console.log('trip data', data);
					is_loading_trip_data = false;
					trip_data = data;

					if (data.shape_polyline) {
						let geojson_polyline_geo = polyline.toGeoJSON(data.shape_polyline, 6);

						let geojson_polyline = {
							geometry: geojson_polyline_geo,
							type: 'Feature',
							properties: {
								text_color: data.text_color,
								color: data.color,
								route_label: data.route_short_name || data.route_long_name
							}
						};

						console.log(' geojson_polyline ', geojson_polyline);

						let geojson_source_new = {
							type: 'FeatureCollection',
							features: [geojson_polyline]
						};

						console.log(' geojson_source_new ', geojson_source_new);

						if (map != null) {
							console.log('map is not null');
							map.getSource('transit_shape_context').setData(geojson_source_new);

							let already_seen_stop_ids: string[] = [];

							let stops_features = data.stoptimes
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
										label: eachstoptime.name,
										stop_id: eachstoptime.stop_id,
										chateau: trip_selected.chateau_id,
									},
									geometry: {
										coordinates: [eachstoptime.longitude, eachstoptime.latitude],
										type: 'Point'
									}
								};
							});

							let stop_source_new = {
								type: 'FeatureCollection',
								features: stops_features
							};

							map.getSource('stops_context').setData(stop_source_new);
						}
					}

					//load alerts in
					alerts = trip_data.alert_id_to_alert;

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

					console.log('alerts', alerts);

					let stoptimes_cleaned: any[] = [];

					if (trip_data.tz != null) {
						if (timezones.indexOf(trip_data.tz) === -1) {
							timezones.push(trip_data.tz);
						}
					}

					let index = 0;
					data.stoptimes.forEach((stoptime: any) => {
						if (timezones.indexOf(stoptime.timezone) === -1) {
							timezones.push(stoptime.timezone);
						}

						let stoptime_to_use = {
							...stoptime,
							strike_departure: false,
							strike_arrival: false,
							rt_arrival_diff: null,
							rt_departure_diff: null
						};

						if (stoptime_to_use.rt_arrival?.time) {
							stoptime_to_use.rt_arrival_time = stoptime_to_use.rt_arrival?.time;
							stoptime_to_use.strike_arrival = true;

							if (stoptime_to_use.scheduled_arrival_time_unix_seconds) {
								if (
									stoptime_to_use.scheduled_arrival_time_unix_seconds >
									stoptime_to_use.rt_departure?.time
								) {
									stoptime_to_use.rt_arrival_time = stoptime_to_use.rt_departure?.time;

									stoptime_to_use.strike_arrival = true;
								}
							}
						}

						if (stoptime_to_use.rt_departure?.time) {
							stoptime_to_use.rt_departure_time = stoptime_to_use.rt_departure?.time;
							stoptime_to_use.strike_departure = true;
						}

						//prevents departure prior to arrival
						if (stoptime_to_use.scheduled_departure_time_unix_seconds) {
							if (stoptime_to_use.rt_arrival?.time) {
								if (
									stoptime_to_use.scheduled_departure_time_unix_seconds <
									stoptime_to_use.rt_arrival?.time
								) {
									stoptime_to_use.rt_departure_time = stoptime_to_use.rt_arrival?.time;

									stoptime_to_use.strike_departure = true;
								}
							}
						}

						if (typeof stoptime_to_use.rt_departure_time == 'number') {
							if (stoptime_to_use.scheduled_departure_time_unix_seconds) {
								stoptime_to_use.rt_departure_diff =
									stoptime_to_use.rt_departure_time -
									stoptime_to_use.scheduled_departure_time_unix_seconds;
							}
						}

						if (typeof stoptime_to_use.rt_arrival_time == 'number') {
							if (stoptime_to_use.scheduled_arrival_time_unix_seconds) {
								stoptime_to_use.rt_arrival_diff =
									stoptime_to_use.rt_arrival_time -
									stoptime_to_use.scheduled_arrival_time_unix_seconds;
							}
						}

						stoptime.show_both_departure_and_arrival = false;

						if (
							stoptime_to_use.scheduled_arrival_time_unix_seconds &&
							stoptime_to_use.scheduled_departure_time_unix_seconds
						) {
							// if both are different by more than 1 minute, show both

							if (
								Math.abs(
									stoptime_to_use.scheduled_arrival_time_unix_seconds -
										stoptime_to_use.scheduled_departure_time_unix_seconds
								) > 60
							) {
								stoptime.show_both_departure_and_arrival = true;
							}

							if (stoptime_to_use.scheduled_arrival_time_unix_seconds == stoptime_to_use.scheduled_departure_time_unix_seconds && 
								stoptime_to_use.rt_arrival_time == stoptime_to_use.rt_departure_time
							) {
								stoptime.show_both_departure_and_arrival = false;
							}
						}

						

						stoptimes_cleaned.push(stoptime_to_use);
						index = index + 1;
					});

					stoptimes_cleaned_dataset = stoptimes_cleaned;

					console.log('stoptimes_cleaned_dataset', stoptimes_cleaned_dataset);
					init_loaded = Date.now();
					console.log('refresh component');
				} catch (e: any) {
					error = text;
				}
			})
			.catch((e) => {
				console.error(e);
			});
	}

	$: if (trip_selected) {
		is_loading_trip_data = true;
		error = null;
		fetch_trip_selected();
	}

	onMount(() => {
		if (fetchtimeout != null) {
			clearInterval(fetchtimeout);
		}

		if (updatetimecounter != null) {
			clearInterval(updatetimecounter);
		}

		fetchtimeout = setInterval(() => {
			update_realtime_data();
		}, 5_000);

		updatetimecounter = setInterval(() => {
			current_time = Date.now();

			let temp_last_inactive_stop_idx = -1;

			let i = 0;
			stoptimes_cleaned_dataset.forEach((stoptime: any) => {
				if (stoptime.rt_departure_time != null) {
					if (stoptime.rt_departure_time < current_time / 1000) {
						temp_last_inactive_stop_idx = i;
					}
				} else {
					if (stoptime.scheduled_departure_time_unix_seconds < current_time / 1000) {
						temp_last_inactive_stop_idx = i;
					} else {
						if (stoptime.rt_arrival_time != null) {
							if (stoptime.rt_arrival_time < current_time / 1000) {
								temp_last_inactive_stop_idx = i;
							}
						} else {
							if (stoptime.scheduled_arrival_time_unix_seconds < current_time / 1000) {
								temp_last_inactive_stop_idx = i;
							}
						}
					}
				}

				i = i + 1;
			});

			if (
				stoptimes_cleaned_dataset[temp_last_inactive_stop_idx - 1].rt_departure_time != null ||
				stoptimes_cleaned_dataset[temp_last_inactive_stop_idx - 1].rt_arrival_time != null
			) {
				last_inactive_stop_idx = temp_last_inactive_stop_idx - 1;
			} else {
				last_inactive_stop_idx = temp_last_inactive_stop_idx;
			}
		}, 100);
	});

	export let simpleRouteMode = true;
</script>

<div class="h-full">
	{#if error != null}
		{error}
	{:else if is_loading_trip_data}
		{#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as it}
			<div class="w-full p-3 flex flex-col gap-y-2">
				<div class="h-5 w-1/2 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
				<div class="h-3 w-1/4 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
				<div class="h-3 w-2/5 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
			</div>
		{/each}
	{:else if trip_data != null}
		<div class="px-3">
			<RouteHeading
				color={trip_data.color}
				text_color={trip_data.text_color}
				route_id={trip_data.route_id}
				chateau_id={trip_selected.chateau_id}
				vehicle={trip_data.vehicle?.label || trip_data.vehicle?.id}
				arrow={true}
				text={fixHeadsignText(
					trip_data.trip_headsign,
					trip_data.route_short_name || trip_data.route_long_name
				)}
				icon={fixHeadsignIcon(trip_data.trip_headsign)}
				run_number={fixRunNumber(
					trip_selected.chateau_id,
					trip_selected.route_type || 3,
					trip_data.route_id,
					trip_data.trip_short_name,
					trip_data.vehicle?.label || trip_data.vehicle?.id,
					trip_data.trip_id
				)}
				short_name={trip_data.route_short_name}
				long_name={trip_data.route_long_name}
				{darkMode}
				disable_pdf={true}
			/>

			<span class={`block ${window_height_known < 600 ? 'leading-none text-xs' : 'mt-1 text-sm'}`} />

			{#if !simpleRouteMode}
				<p class={`${window_height_known < 600 ? ' text-xs' : ' text-sm'}`}>
					Trip ID {trip_selected.trip_id}{#if trip_data.block_id != null}
						<span>{' | Block '}{trip_data.block_id}</span>
					{/if}
				</p>

				<p  class={`${window_height_known < 600 ? ' text-xs' : ' text-sm'}`}>
					{#if timezones.filter((x) => x != null).length == 1}
						{$_('timezone')}: {timezones[0]}
					{:else}
						{$_('timezone')}: {timezones.filter((x) => x != null).join(', ')}
					{/if}
				</p>
				{#if init_loaded != 0}
					<div>
						<p  class={`${window_height_known < 600 ? ' text-xs' : ' text-sm'}`}>
							{$_('lastupdated')}:
							<TimeDiff diff={init_loaded / 1000 - current_time / 1000} show_brackets={false} />
						</p>
					</div>
				{/if}
			{/if}
		</div>

		<div
			bind:this={bind_scrolling_div}
			class="flex flex-col catenary-scroll overflow-y-scroll h-full pb-60 px-3 pt-2"
			style:border-top={`3px solid ${trip_data.color}`}
		>
			{#if Object.keys(alerts).length > 0}
				<div class="border-[#F99C24] border-2 leading-snug mb-3 p-2 rounded-md">
					<img src="/icons/service_alert.svg" alt="(i)" class="h-6 w-6 inline mr-1" />
					<span class="text-[#F99C24] font-medium"
						>Service Alert{Object.keys(alerts).length > 1 ? 's' : ''}</span
					>
					{#each Object.values(alerts) as alert}
						<div class="pt-1">
							{#each alert.header_text.translation as each_header_translation_obj}
								<p class="text-sm font-bold">{each_header_translation_obj.text}</p>
								{#each alert.description_text.translation.filter((x) => x.language == each_header_translation_obj.language) as description_alert}
									<div class="leading-none">
										{#each description_alert.text.split('\n') as each_desc_line}
											<p class="text-sm">
												{@html each_desc_line.replaceAll(
													'<a ',
													'<a target="_blank" class="text-sky-500 dark:text-sky-300 underline"'
												)}
											</p>
										{/each}
									</div>
								{/each}
							{/each}
						</div>
					{/each}
				</div>
			{/if}

			{#key trip_data}
				{#if show_previous_stops && last_inactive_stop_idx > -1}
					<button
						on:click={() => {
							show_previous_stops = false;
						}}
						class="cursor-pointer text-md font-medium text-seashore mb-2"
					>
						&darr;
						{$_('hidepreviousstops')}
					</button>
				{/if}
				{#if !show_previous_stops && last_inactive_stop_idx > -1}
					<button
						on:click={() => {
							show_previous_stops = true;
						}}
						class="cursor-pointer text-md font-medium text-seashore mb-2"
					>
						&uarr;
						{$_('shownpreviousstops', {
							values: {
								n: last_inactive_stop_idx + 1
							}
						})}
					</button>
				{/if}
			{/key}

			{#each stoptimes_cleaned_dataset as stoptime, i}
				{#if show_previous_stops || i > last_inactive_stop_idx}
					<div class="flex flex-row">
						<div class="flex flex-col w-2 relative justify-center" style={``}>
							<div
								style={`background: ${i - 1 == last_inactive_stop_idx && i != 0 ? `linear-gradient(${show_previous_stops ? `rgba(${Object.values(hexToRgb(trip_data.color)).join(',')}, 0.4)` : 'transparent'}, ${trip_data.color})` : i != 0 ? trip_data.color : 'transparent'};  opacity: ${last_inactive_stop_idx >= i ? 0.4 : 1};`}
								class={`h-1/2 w-2 ${i == trip_data.stoptimes.length - 1 ? 'rounded-b-full' : ''}`}
							></div>
							<div
								style={`background-color: ${i != trip_data.stoptimes.length - 1 ? trip_data.color : 'transparent'}; opacity: ${last_inactive_stop_idx >= i ? 0.4 : 1};`}
								class={`h-1/2 w-2 ${i == 0 ? 'rounded-t-full' : ''}`}
							></div>

							{#if stoptime.schedule_relationship == 1}
								<div
									class="flex flex-row absolute top-1/2 bottom-1/2 left-[-3px] h-6 w-6 rounded-full bg-red-500 border-white border"
								>
									<span
										class="my-auto mx-auto material-symbols-outlined text-base font-bold bottom-2"
									>
										close
									</span>
								</div>
							{:else}
								<div
									class={`absolute top-1/2 bottom-1/2 left-0 w-2 h-2 rounded-full ${i > last_inactive_stop_idx ? 'bg-white' : ' bg-gray-400'}`}
								></div>
							{/if}
						</div>

						<div class="mr-4"></div>

						<div class="w-full py-2 pr-1 lg:pr-2">
							<p class="">
								<span
									class={`font-semibold ${stoptime.schedule_relationship == 1 ? 'text-[#EF3841]' : stop_id_to_alert_ids[stoptime.stop_id] ? 'text-[#F99C24]' : ''}`}
									>{fixStationName(stoptime.name)}</span
								>

								{#if stop_id_to_alert_ids[stoptime.stop_id]}
									<img src="/icons/service_alert.svg" alt="(i)" class="w-4 h-4 inline mr-1" />
								{/if}

								{#if stoptime.schedule_relationship == 1}
									<img src="/icons/cancellation.svg" alt="(i)" class="w-4 h-4 inline mr-1" />
								{/if}

								{#if stoptime.code && !simpleRouteMode}
									<span class="text-gray-800 dark:text-gray-200">{stoptime.code}</span>
								{/if}
							</p>

							<div class="flex flex-row">
								{#if stoptime.rt_departure_time != null || stoptime.scheduled_departure_time_unix_seconds != null || stoptime.interpolated_stoptime_unix_seconds != null}
									{#if !(stoptime.rt_departure_time == null && stoptime.strike_departure == true)}
										<span
											style:color={`${stoptime.rt_departure_time || stoptime.rt_arrival_time ? '#42a7c5' : ''}`}
											class="text-[0px] font-semibold"
										>
											<TimeDiff
												diff={(stoptime.rt_arrival_time || stoptime.rt_departure_time ||
													stoptime.scheduled_departure_time_unix_seconds ||
													stoptime.interpolated_stoptime_unix_seconds) -
													current_time / 1000}
												show_brackets={false}
												show_seconds={false}
											/>
										</span>
									{/if}
								{/if}
								{#if stoptime.rt_departure_time || stoptime.rt_arrival_time}
									<svg
										class="inline ml-1 w-3 h-3 translate-y-1"
										height="24"
										viewBox="0 -960 960 960"
										width="24"
										fill={'#42a7c5'}
										><path
											d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z"
										/></svg
									>
									<span class="ml-2"></span>
									<DelayDiff
										diff={stoptime.rt_arrival_diff || stoptime.rt_departure_diff}
										simple={simpleRouteMode}
									/>
								{:else}
									<svg
										class="inline ml-1 w-3 h-3 translate-y-1"
										height="24"
										viewBox="0 -960 960 960"
										width="24"
										fill={'white'}
										><path
											d="M440-120v-264L254-197l-57-57 187-186H120v-80h264L197-706l57-57 186 187v-264h80v264l186-187 57 57-187 186h264v80H576l187 186-57 57-186-187v264h-80Z"
										/></svg
									>
								{/if}

								<!-- {#if (simpleRouteMode && stoptime.rt_arrival_diff && stoptime.rt_departure_diff && stoptime.rt_arrival_time == stoptime.rt_departure_time) || (stoptime.rt_departure_diff && !stoptime.rt_arrival_diff) || (stoptime.rt_arrival_diff && !stoptime.rt_departure_diff) || (!stoptime.rt_arrival_diff && !stoptime.rt_departure_diff && (stoptime.rt_arrival_time || stoptime.rt_departure_time)) || (!stoptime.rt_arrival_diff && !stoptime.rt_departure_diff && stoptime.scheduled_arrival_time_unix_seconds == stoptime.scheduled_departure_time_unix_seconds)} -->

								<div class="ml-auto text-sm">
									<div class="text-sm text-right">
										<p class="text-right">
											{#if stoptime.rt_arrival_time}
												{#if ((stoptime.rt_arrival_time != stoptime.rt_departure_time) && stoptime.rt_arrival_time && stoptime.rt_departure_time) || ((stoptime.scheduled_arrival_time_unix_seconds != stoptime.scheduled_departure_time_unix_seconds) && stoptime.scheduled_arrival_time_unix_seconds && stoptime.scheduled_departure_time_unix_seconds)}<span class="text-xs align-middle mr-1 inline-block -translate-y-0.5 text-slate-600 dark:text-gray-400">{$_('arrival')}</span>{/if}
												<span
													class={`${stoptime.strike_arrival == true ? 'text-slate-600 dark:text-gray-400 line-through' : ''}`}
												>
													{new Date(
														(stoptime.scheduled_arrival_time_unix_seconds ||
															stoptime.interpolated_stoptime_unix_seconds) * 1000
													).toLocaleTimeString(usunits ? 'en-US' : 'en-UK', {
														timeZone: stoptime.timezone || trip_data.tz,
														hour: simpleRouteMode ? 'numeric' : '2-digit',
														minute: '2-digit',
														second: simpleRouteMode ? undefined : '2-digit'
													})}
												</span>
												<span class="text-seashore font-medium">
													{new Date(stoptime.rt_arrival_time * 1000).toLocaleTimeString(
														usunits ? 'en-US' : 'en-UK',
														{
															timeZone: stoptime.timezone || trip_data.tz,
															hour: simpleRouteMode ? 'numeric' : '2-digit',
															minute: '2-digit',
															second: simpleRouteMode ? undefined : '2-digit'
														}
													)}
												</span>
											{:else if stoptime.rt_departure_time}
												{#if ((stoptime.rt_arrival_time != stoptime.rt_departure_time) && stoptime.rt_arrival_time && stoptime.rt_departure_time) || ((stoptime.scheduled_arrival_time_unix_seconds != stoptime.scheduled_departure_time_unix_seconds) && stoptime.scheduled_arrival_time_unix_seconds && stoptime.scheduled_departure_time_unix_seconds)}<span class="text-xs align-middle mr-1 inline-block -translate-y-0.5 text-slate-600 dark:text-gray-400">{$_('departure')}</span>{/if}
												<span
													class={`${stoptime.strike_departure == true ? 'text-slate-600 dark:text-gray-400 line-through' : ''}`}
												>
													{new Date(
														(stoptime.scheduled_departure_time_unix_seconds ||
															stoptime.interpolated_stoptime_unix_seconds) * 1000
													).toLocaleTimeString(usunits ? 'en-US' : 'en-UK', {
														timeZone: stoptime.timezone || trip_data.tz,
														hour: simpleRouteMode ? 'numeric' : '2-digit',
														minute: '2-digit',
														second: simpleRouteMode ? undefined : '2-digit'
													})}
												</span>
												<span class="text-seashore font-medium">
													{new Date(stoptime.rt_departure_time * 1000).toLocaleTimeString(
														usunits ? 'en-US' : 'en-UK',
														{
															timeZone: stoptime.timezone || trip_data.tz,
															hour: simpleRouteMode ? 'numeric' : '2-digit',
															minute: '2-digit',
															second: simpleRouteMode ? undefined : '2-digit'
														}
													)}
												</span>
											{:else}
												{#if ((stoptime.rt_arrival_time != stoptime.rt_departure_time) && stoptime.rt_arrival_time && stoptime.rt_departure_time) || ((stoptime.scheduled_arrival_time_unix_seconds != stoptime.scheduled_departure_time_unix_seconds) && stoptime.scheduled_arrival_time_unix_seconds && stoptime.scheduled_departure_time_unix_seconds)}<span class="text-xs align-middle mr-1 inline-block -translate-y-0.5 text-slate-600 dark:text-gray-400">{$_('departure')}</span>{/if}
												{new Date(
													(stoptime.scheduled_departure_time_unix_seconds ||
														stoptime.interpolated_stoptime_unix_seconds) * 1000
												).toLocaleTimeString(usunits ? 'en-US' : 'en-UK', {
													timeZone: stoptime.timezone || trip_data.tz,
													hour: simpleRouteMode ? 'numeric' : '2-digit',
													minute: '2-digit',
													second: simpleRouteMode ? undefined : '2-digit'
												})}
											{/if}
										</p>
									</div>
								</div>
							</div>

							{#if ((stoptime.rt_arrival_time != stoptime.rt_departure_time) && stoptime.rt_arrival_time && stoptime.rt_departure_time) || ((stoptime.scheduled_arrival_time_unix_seconds != stoptime.scheduled_departure_time_unix_seconds) && stoptime.scheduled_arrival_time_unix_seconds && stoptime.scheduled_departure_time_unix_seconds)}
								<div class="flex flex-row">
									{#if stoptime.rt_departure_time != null || stoptime.scheduled_departure_time_unix_seconds != null || stoptime.interpolated_stoptime_unix_seconds != null}
										{#if !(stoptime.rt_departure_time == null && stoptime.strike_departure == true)}
											<span
												style:color={`${stoptime.rt_departure_time || stoptime.rt_arrival_time ? '#42a7c5' : ''}`}
												class="text-[0px] font-semibold"
											>
												<TimeDiff
													diff={(stoptime.rt_departure_time ||
														stoptime.scheduled_departure_time_unix_seconds ||
														stoptime.interpolated_stoptime_unix_seconds) -
														current_time / 1000}
													show_brackets={false}
													show_seconds={false}
												/>
											</span>
										{/if}
									{/if}
									{#if stoptime.rt_departure_time}
										<svg
											class="inline ml-1 w-3 h-3 translate-y-1"
											height="24"
											viewBox="0 -960 960 960"
											width="24"
											fill={'#42a7c5'}
											><path
												d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z"
											/></svg
										>
										<span class="ml-2"></span>
										<DelayDiff diff={stoptime.rt_departure_diff} simple={simpleRouteMode} />
									{:else}
										<svg
											class="inline ml-1 w-3 h-3 translate-y-1"
											height="24"
											viewBox="0 -960 960 960"
											width="24"
											fill={'white'}
											><path
												d="M440-120v-264L254-197l-57-57 187-186H120v-80h264L197-706l57-57 186 187v-264h80v264l186-187 57 57-187 186h264v80H576l187 186-57 57-186-187v264h-80Z"
											/></svg
										>
									{/if}
									<div class="ml-auto text-sm">
										<div class="text-sm text-right">
											<p class="text-right">
												<span class="text-xs align-middle mr-1 inline-block -translate-y-0.5 text-slate-600 dark:text-gray-400">{$_('departure')}</span>
												{#if stoptime.rt_departure_time}
													<span
														class={`${stoptime.strike_departure == true ? 'text-slate-600 dark:text-gray-400 line-through' : ''}`}
													>
														{new Date(
															(stoptime.scheduled_departure_time_unix_seconds ||
																stoptime.interpolated_stoptime_unix_seconds) * 1000
														).toLocaleTimeString(usunits ? 'en-US' : 'en-UK', {
															timeZone: stoptime.timezone || trip_data.tz,
															hour: simpleRouteMode ? 'numeric' : '2-digit',
															minute: '2-digit',
															second: simpleRouteMode ? undefined : '2-digit'
														})}
													</span>
													<span class="text-seashore font-medium">
														{new Date(stoptime.rt_departure_time * 1000).toLocaleTimeString(
															usunits ? 'en-US' : 'en-UK',
															{
																timeZone: stoptime.timezone || trip_data.tz,
																hour: simpleRouteMode ? 'numeric' : '2-digit',
																minute: '2-digit',
																second: simpleRouteMode ? undefined : '2-digit'
															}
														)}
													</span>
												{:else}
													{new Date(
														(stoptime.scheduled_departure_time_unix_seconds ||
															stoptime.interpolated_stoptime_unix_seconds) * 1000
													).toLocaleTimeString(usunits ? 'en-US' : 'en-UK', {
														timeZone: stoptime.timezone || trip_data.tz,
														hour: simpleRouteMode ? 'numeric' : '2-digit',
														minute: '2-digit',
														second: simpleRouteMode ? undefined : '2-digit'
													})}
												{/if}
											</p>
										</div>
									</div>
								</div>
							{/if}

							{#if timezones.filter((x) => x != null).length > 1}
								<p class="text-xs text-gray-900 dark:text-gray-400">
									{$_('timezone')}: {stoptime.timezone || trip_data.tz}
								</p>
							{/if}

							{#if stoptime.rt_platform_string}
								<p class="text-xs text-gray-900 dark:text-gray-400">
									{$_('platform')}: {stoptime.rt_platform_string}
								</p>
							{/if}

							<!--<p class="text-sm">
									index of stop seq: {stoptime.gtfs_stop_sequence}
								</p>-->
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
