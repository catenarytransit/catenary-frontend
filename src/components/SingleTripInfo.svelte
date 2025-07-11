<script lang="ts">
	import { json, text } from '@sveltejs/kit';
	import { BlockStack, SingleTrip, StackInterface, StopStack } from '../components/stackenum';
	import { onDestroy, onMount } from 'svelte';
	import { locale, locales } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
	import { _ } from 'svelte-i18n';
	import RouteIcon from './RouteIcon.svelte';
	import { lightenColour } from './lightenDarkColour';
	import DelayDiff from './DelayDiff.svelte';
	import TimeDiff from './TimeDiff.svelte';
	import polyline from '@mapbox/polyline';
	import AlertBox from './serviceAlerts.svelte';
	import { writable, get } from 'svelte/store';
	import stringifyObject from 'stringify-object';
	import BullseyeArrow from './svg_icons/bullseye_arrow.svelte';
	import { refilter_stops } from './makeFiltersForStop';
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
	let bigfetchtimeout: NodeJS.Timeout | null = null;
	let updatetimecounter: NodeJS.Timeout | null = null;
	let show_previous_stops: boolean = false;
	let bind_scrolling_div: null | HTMLElement = null;

	export let window_height_known: number = 500;
	onMount(() => {
		window_height_known = window.innerHeight;

		window.addEventListener('resize', () => {
			window_height_known = window.innerHeight;
		});
	});

	export let usunits: boolean;

	import {
		data_stack_store,
		on_sidebar_trigger_store,
		realtime_vehicle_locations_last_updated_store,
		realtime_vehicle_locations_store,
		realtime_vehicle_route_cache_hash_store,
		realtime_vehicle_route_cache_store,
		lock_on_gps_store,
		show_seconds_store,
		usunits_store,
		show_zombie_buses_store,
		show_my_location_store,
		custom_icons_category_to_layer_id,
		map_pointer_store,
		show_gtfs_ids_store,
		ui_theme_store,
		stops_to_hide_store
	} from '../globalstores';
	import RouteHeading from './RouteHeading.svelte';
	import { hexToRgb } from '../utils/colour';
	import { determineDarkModeToBool } from './determineDarkModeToBool';
	import NativeLands from './NativeLands.svelte';
	import { occupancy_to_symbol } from './occupancy_to_symbol';
	import StopTimeNumber from './StopTimeNumber.svelte';
	import VehicleInfo from './vehicle_info.svelte';

	function fix_vehicle_number(chateau_id: string, vehicle_id: string) {
		if (chateau_id == 'translink-queensland-au') {
			return vehicle_id.split('_')[1];
		} else {
			return vehicle_id;
		}
	}

	let show_seconds = get(show_seconds_store);

	show_seconds_store.subscribe((value) => {
		show_seconds = value;
	});

	let stop_id_to_alert_ids: Record<string, string[]> = {};

	let alerts: Record<string, any> = {};

	let show_gtfs_ids = get(show_gtfs_ids_store);

	show_gtfs_ids_store.subscribe((value) => {
		show_gtfs_ids = value;
	});

	let vehicle_data: any | null = null;

	let db_vehicle_label: string | null = null;

	let all_exact_stoptimes: boolean = true;

	let last_inactive_stop_idx = -1;

	async function update_vehicle_rt() {
		// /get_vehicle_information_from_label/{chateau}/{vehicle_label}
		if (trip_data) {
			
			if (trip_data.vehicle?.label || trip_data.vehicle?.id || trip_selected.vehicle_id) {
				let url = new URL(
					`https://birch.catenarymaps.org/get_vehicle_information_from_label/${trip_selected.chateau_id}/${trip_data.vehicle.label || trip_data.vehicle.id || trip_selected.vehicle_id}`
				);

				await fetch(url.toString()).then(async (response) => {
					let text = await response.text();
					try {
						const data = JSON.parse(text);
						//console.log('vehicle data', data);

						vehicle_data = data.data;
					} catch (e: any) {
						console.error(e);
					}
				});
			} else {
				//console.log('no vehicle label found')
			}
		}
	}

	async function update_realtime_data() {
		let url = new URL(
			`https://birch_req_trip.catenarymaps.org/get_trip_information_rt_update/${trip_selected.chateau_id}/`
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
				//	console.log('rt trip data', rt_update_json);

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
					//console.log('single trip rt update', stoptimes_cleaned_dataset);
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

	export let darkMode: boolean = determineDarkModeToBool();

	async function fetch_trip_selected() {
		let map = get(map_pointer_store);

		console.log('t-s', trip_selected);

		let url = new URL(
			`https://birch_req_trip.catenarymaps.org/get_trip_information/${trip_selected.chateau_id}/`
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
					//	console.log('trip data', data);
					is_loading_trip_data = false;
					trip_data = data;

					map.getSource('transit_shape_context_for_stop').setData(
						{
							'type': 'FeatureCollection',
							features: []
						}
					);


					if (data.shape_polyline) {
						let geojson_polyline_geo = polyline.toGeoJSON(data.shape_polyline);

						let geojson_polyline = {
							geometry: geojson_polyline_geo,
							type: 'Feature',
							properties: {
								text_color: data.text_color,
								color: data.color,
								route_label: data.route_short_name || data.route_long_name
							}
						};

						//		console.log(' geojson_polyline ', geojson_polyline);

						let geojson_source_new = { type: 'FeatureCollection', features: [geojson_polyline] };

						//	console.log(' geojson_source_new ', geojson_source_new);

						if (map != null) {
							//console.log('map is not null');
							let transit_shape_context = map.getSource('transit_shape_context');
							if (transit_shape_context) {
								transit_shape_context.setData(geojson_source_new);
							}

							let transit_shape_detour = map.getSource('transit_shape_context_detour');

							if (data.old_shape_polyline) {
								transit_shape_detour.setData({
									type: 'FeatureCollection',
									features: [
										{
											geometry: polyline.toGeoJSON(data.old_shape_polyline),
											type: 'Feature',
											properties: {
												text_color: data.text_color,
												color: data.color,
												route_label: data.route_short_name || data.route_long_name
											}
										}
									]
								});
							} else {
								transit_shape_detour.setData( { type: 'FeatureCollection', features: [] });
							}


							
						}
					} else {
						let transit_shape_context = map.getSource('transit_shape_context');
						transit_shape_context.setData( { type: 'FeatureCollection', features: [] });

						let transit_shape_detour = map?.getSource('transit_shape_context_detour');

						transit_shape_detour.setData( { type: 'FeatureCollection', features: [] });

					}

					if (map != null) {

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
											label: eachstoptime.name
												.replace('Station ', '')
												.replace(' Station', '')
												.replace(', Bahnhof', '')
												.replace(' Bahnhof', '')
												.replace('Estación de tren ', '')
												.replace(' Metrolink', '')
												.replace('Northbound', 'N.B.')
												.replace('Eastbound', 'E.B.')
												.replace('Southbound', 'S.B.')
												.replace('Westbound', 'W.B.')
												.replace(' (Railway) ', '')
												.replace(' Light Rail', '').replace(" Amtrak", ""),
											stop_id: eachstoptime.stop_id,
											chateau: trip_selected.chateau_id,
											stop_route_type: trip_data.route_type,
											cancelled: eachstoptime.schedule_relationship == 1
										},
										geometry: {
											coordinates: [eachstoptime.longitude, eachstoptime.latitude],
											type: 'Point'
										}
									};
								});

							let stop_source_new = { type: 'FeatureCollection', features: stops_features };

							let stops_context = map.getSource('stops_context');
							if (stops_context) {
								stops_context.setData(stop_source_new);
							}

							try {

								stops_to_hide_store.set({
								[trip_selected.chateau_id]: data.stoptimes.map((eachstop: any) => eachstop.stop_id)
							});

							refilter_stops();
							} catch (e) {
								console.error(e);
							}

							update_vehicle_rt();
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

							if (
								stoptime_to_use.scheduled_arrival_time_unix_seconds ==
									stoptime_to_use.scheduled_departure_time_unix_seconds &&
								stoptime_to_use.rt_arrival_time == stoptime_to_use.rt_departure_time
							) {
								stoptime.show_both_departure_and_arrival = false;
							}
						}

						stoptimes_cleaned.push(stoptime_to_use);
						index = index + 1;
					});

					let all_timepoints_empty = data.stoptimes.every(
						(stoptime: any) => stoptime.timepoint == null
					);

					if (all_timepoints_empty) {
						all_exact_stoptimes = true;
					} else {
						let all_timepoints_true = data.stoptimes.every(
							(stoptime: any) => stoptime.timepoint == true
						);
						all_exact_stoptimes = all_timepoints_true;
					}

					stoptimes_cleaned_dataset = stoptimes_cleaned;

					console.log('stoptimes_cleaned_dataset', stoptimes_cleaned_dataset);
					init_loaded = Date.now();
					console.log('refresh component');
				} catch (e: any) {
					console.error(e);
					error = text;
					console.log(stringifyObject(trip_selected, { indent: '  ', singleQuotes: false }));
				}
			})
			.catch((e) => {
				console.error(e);
				console.log(stringifyObject(trip_selected, { indent: '  ', singleQuotes: false }));
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

			update_vehicle_rt();
		}, 1_000);

		bigfetchtimeout = setInterval(() => {
			if (trip_selected) {
				fetch_trip_selected();
			}

			update_vehicle_rt();
		}, 30_000);

		updatetimecounter = setInterval(() => {
			current_time = Date.now();

			let temp_last_inactive_stop_idx = -1;

			let i = 0;

			let locked = false;

			//console.log('stoptimes_cleaned_dataset', stoptimes_cleaned_dataset)

			stoptimes_cleaned_dataset.forEach((stoptime: any) => {
				if (stoptime.rt_departure_time != null) {
					if (stoptime.rt_departure_time < current_time / 1000) {
						temp_last_inactive_stop_idx = i;
					}
				} else {
					if ((stoptime.scheduled_departure_time_unix_seconds ||
					stoptime.interpolated_stoptime_unix_seconds) && (
						(stoptime.scheduled_departure_time_unix_seconds ||
							stoptime.interpolated_stoptime_unix_seconds) <
						current_time / 1000
					)) {
						if (!(stoptime.schedule_relationship == 1 && i - 1 > temp_last_inactive_stop_idx)) {
							temp_last_inactive_stop_idx = i;
						}
					} else {
						if (stoptime.rt_arrival_time != null) {
							if (stoptime.rt_arrival_time < current_time / 1000) {
								temp_last_inactive_stop_idx = i;
							}
						} else {
							if (stoptime.scheduled_arrival_time_unix_seconds) {
								if (stoptime.scheduled_arrival_time_unix_seconds < current_time / 1000) {
								if (!(stoptime.schedule_relationship == 1 && i - 1 > temp_last_inactive_stop_idx)) {
									temp_last_inactive_stop_idx = i;
								}
							}
							}
							
						}
					}
				}

				i = i + 1;
			});

			if (temp_last_inactive_stop_idx > 0) {
				if (
					stoptimes_cleaned_dataset[temp_last_inactive_stop_idx - 1].rt_departure_time != null ||
					stoptimes_cleaned_dataset[temp_last_inactive_stop_idx - 1].rt_arrival_time != null
				) {
					last_inactive_stop_idx = temp_last_inactive_stop_idx - 1;
				} else {
					last_inactive_stop_idx = temp_last_inactive_stop_idx;
				}
			}
		}, 100);

		return () => {
			clearInterval(fetchtimeout);
			clearInterval(updatetimecounter);
			clearInterval(bigfetchtimeout);

			stops_to_hide_store.set({});

			refilter_stops();
		};
	});
</script>

{#if error != null}
	<div>
		<p>Error from server:</p>
		<p class="font-mono">{error}</p>
		<p>Request made:</p>
		<p class="text-wrap text-xs font-mono">
			{@html stringifyObject(trip_selected, { indent: '\t', singleQuotes: false }).replaceAll(
				'\n',
				'<br/>'
			)}
		</p>
		<p>
			Report this error to the Catenary Discussions page or the frontend issues page on GitHub: <a
				href="https://github.com/orgs/catenarytransit/discussions"
				target="_blank"
				class="underline text-blue-500 dark:text-blue-300"
				>https://github.com/orgs/catenarytransit/discussions</a
			>
		</p>
	</div>
	{/if}
{#if is_loading_trip_data}
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
			vehicle={fix_vehicle_number(
				trip_selected.chateau_id,
				trip_data.vehicle?.label || trip_data.vehicle?.id || trip_selected.vehicle_id
			)}
			arrow={true}
			text={fixHeadsignText(
				trip_data.trip_headsign,
				trip_data.route_short_name || trip_data.route_long_name
			)}
			icon={fixHeadsignIcon(trip_data.trip_headsign)}
			run_number={fixRunNumber(
				trip_selected.chateau_id,
				trip_data.route_type,
				trip_data.route_id,
				trip_data.trip_short_name,
				trip_data.vehicle?.label || trip_data.vehicle?.id,
				trip_data.trip_id
			)}
			short_name={trip_data.route_short_name}
			long_name={trip_data.route_long_name}
			{darkMode}
			disable_pdf={true}
			route_type={trip_data.route_type}
			make_clickable_route_name={true}
		/>

		<span class={`block ${window_height_known < 600 ? 'leading-none text-xs' : 'mt-1 text-sm'}`} />

		<p class={`${window_height_known < 600 ? ' text-xs' : 'text-sm'} leading-none`}>
			{$_("tripid")} {trip_selected.trip_id}{#if trip_data.block_id != null}
			<span>{" | "}</span>	
			<span
			on:click={() => {
				data_stack_store.update((x) => {
					console.log(trip_selected.chateau_id, trip_data.block_id, trip_data.service_date);
					x.push(new StackInterface(
						new BlockStack(trip_selected.chateau_id, trip_data.block_id, trip_data.service_date)
					))

					return x;
				})
			}}
			class="underline text-blue-800 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 cursor-pointer">{$_('block')} {trip_data.block_id}</span>
			{/if}
		</p>

		<p class={`${window_height_known < 600 ? ' text-xs' : 'text-sm'} leading-none`}>
			{#if timezones.filter((x) => x != null).length == 1}
				{$_('timezone')}: {timezones[0]}
			{:else}
				{$_('timezone')}: {timezones.filter((x) => x != null).join(', ')}
			{/if}
		</p>
	</div>

	<div
		bind:this={bind_scrolling_div}
		class="flex flex-col catenary-scroll overflow-y-scroll h-full px-3 pt-2"
		style:border-top={`3px solid ${trip_data.color}`}
	>
		{#if show_gtfs_ids}
			<div class="font-mono px-3">
				<div class="text-xs md:text-sm font-mono text-gray-500 dark:text-gray-400 leading-none">
					Château: <span class="font-bold">{trip_selected.chateau_id}</span>
					<br />
					Route: <span class="font-bold">{trip_selected.route_id}</span>
				</div>
			</div>
		{/if}

		{#if vehicle_data}
			<div>
				<span class="text-xs">
					{$_('lastupdated')}: <TimeDiff
						show_seconds={true}
						show_brackets={false}
						diff={vehicle_data.timestamp - current_time / 1000}
					/>
				</span>
				{#if vehicle_data.position?.speed != null}
					<span class="text-xs">
						<span class='px-2'>{''}</span>
						{$_('speed')}:

						{#if usunits}
							{(vehicle_data.position?.speed * 2.23694).toFixed(2)} mph
						{:else}
							{(vehicle_data.position?.speed * 3.6).toFixed(2)} km/h
						{/if}
					</span>{/if}

				{#if vehicle_data.occupancy_status != null}
					<p
						class={`text-xs ${vehicle_data.occupancy_status == 3 ? 'text-amber-600 dark:text-amber-400' : ''} ${[4, 5, 6, 8].includes(vehicle_data.occupancy_status) ? 'text-red-600 dark:text-red-400' : ''}`}
					>
						{$_('occupancy_status')}:
						<span class="rounded-full px-0.5 py-0.5"
							>{occupancy_to_symbol(vehicle_data.occupancy_status)}</span
						>
						{#if vehicle_data.occupancy_status == 0}
							{$_('occupancy_status_empty')}
						{:else if vehicle_data.occupancy_status == 1}
							{$_('occupancy_status_many_seats_available')}
						{:else if vehicle_data.occupancy_status == 2}
							{$_('occupancy_status_few_seats_available')}
						{:else if vehicle_data.occupancy_status == 3}
							{$_('occupancy_status_standing_room_only')}
						{:else if vehicle_data.occupancy_status == 4}
							{$_('occupancy_status_crushed_standing_room_only')}
						{:else if vehicle_data.occupancy_status == 5}
							{$_('occupancy_status_full')}
						{:else if vehicle_data.occupancy_status == 6}
							{$_('occupancy_status_not_accepting_passengers')}
						{:else if vehicle_data.occupancy_status == 7}
							{$_('occupancy_status_no_data')}
						{:else if vehicle_data.occupancy_status == 8}
							{$_('occupancy_status_not_boardable')}
						{/if}
					</p>{/if}

				{#if vehicle_data.occupancy_percentage != null && vehicle_data.occupancy_percentage != 0}
				<p class="text-xs">{$_('occupancy_percentage')}: {vehicle_data.occupancy_percentage}%</p>
				{/if}
			</div>
		{/if}

		<div class="pb-1">
			<VehicleInfo
			chateau={trip_selected.chateau_id}
			label={trip_selected.vehicle_id || trip_data.vehicle?.label || trip_data.vehicle?.id}
			route_id={trip_data.route_id}
		/>
		</div>

		{#if all_exact_stoptimes == true}
			<div class="flex flex-row">
				<div class="rounded-2xl flex flex-row text-xs dark:bg-opacity-70 mr-auto">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5 align-middle"
						><title>timeline-clock</title><path
							fill="currentColor"
							d="M4 2V8H2V2H4M2 22V16H4V22H2M5 12C5 13.11 4.11 14 3 14C1.9 14 1 13.11 1 12C1 10.9 1.9 10 3 10C4.11 10 5 10.9 5 12M16 4C20.42 4 24 7.58 24 12C24 16.42 20.42 20 16 20C12.4 20 9.36 17.62 8.35 14.35L6 12L8.35 9.65C9.36 6.38 12.4 4 16 4M15 13L19.53 15.79L20.33 14.5L16.5 12.2V7H15V13Z"
						/></svg
					>

					<span class="align-middle my-auto ml-1 font-semibold">
						{$_("allexact")}
					</span>
				</div>
			</div>
		{/if}

		{
			#if trip_data.rt_shape
		}

		<div class="text-orange-500 italics text-semibold text-sm">{$_("new_rt_shape")}</div>

		{/if}

		<AlertBox {alerts} 
		default_tz={trip_data.tz || null}
		/>

		{#key trip_data}
			{#if show_previous_stops && last_inactive_stop_idx > -1}
				<button
					on:click={() => {
						show_previous_stops = false;
					}}
					class="cursor-pointer text-md font-medium text-seashore dark:text-seashoredark mb-2"
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
					class="cursor-pointer text-md font-medium text-seashore dark:text-seashoredark mb-2"
				>
					&uarr;
					{$_('shownpreviousstops', { values: { n: last_inactive_stop_idx + 1 } })}
				</button>
			{/if}
		{/key}

		{#each stoptimes_cleaned_dataset as stoptime, i}
			{#if show_previous_stops || i > last_inactive_stop_idx}
				<div class="flex flex-row">
					<!--The left side coloured bars to indicate trip progress-->
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
								class="flex flex-row absolute align-middle top-1/2 bottom-1/2 left-[-8px] h-6 w-6 rounded-full bg-red-500 border-red-900  border-2 "
							>
								<div class='my-auto mx-auto'>
									<svg xmlns="http://www.w3.org/2000/svg" class='h-5 w-5' viewBox="0 0 24 24"><title>cancel</title><path fill='currentColor' d="M12 2C17.5 2 22 6.5 22 12S17.5 22 12 22 2 17.5 2 12 6.5 2 12 2M12 4C10.1 4 8.4 4.6 7.1 5.7L18.3 16.9C19.3 15.5 20 13.8 20 12C20 7.6 16.4 4 12 4M16.9 18.3L5.7 7.1C4.6 8.4 4 10.1 4 12C4 16.4 7.6 20 12 20C13.9 20 15.6 19.4 16.9 18.3Z" /></svg>
								</div>
							</div>
						{:else}
							<div
								class={`absolute top-1/2 bottom-1/2 left-0 w-2 h-2 rounded-full ${i > last_inactive_stop_idx ? 'bg-white' : ' bg-gray-400'}`}
							></div>
						{/if}
					</div>

					<div class="mr-3 md:mr-4"></div>

					<div
						class={`w-full py-1 sm:py-2 pr-1 lg:pr-2  ${i <= last_inactive_stop_idx ? ' opacity-70' : ''}`}
					>
						<p class="text-sm sm:text-base">
							{#if stoptime.name}
								<span
							on:click={() => {
								//add the stop to the data stack

								data_stack_store.update((x) => {
									x.push(new StackInterface(new StopStack(trip_selected.chateau_id, stoptime.stop_id)));
									return x;
								});
							}}

									class={`underline decoration-sky-500/80 hover:decoration-sky-500 cursor-pointer ${stoptime.schedule_relationship == 1 ? 'text-[#EF3841]' : stop_id_to_alert_ids[stoptime.stop_id] ? 'text-[#F99C24]' : ''}`}
									>{fixStationName(stoptime.name)}</span
								>
							{/if}

							{#if stop_id_to_alert_ids[stoptime.stop_id]}
								<img src="/icons/service_alert.svg" alt="(i)" class="w-4 h-4 inline mr-1" />
							{/if}

							{#if stoptime.schedule_relationship == 1}
								<img src="/icons/cancellation.svg" alt="(i)" class="w-4 h-4 inline mr-1" />
							{/if}

							{#if stoptime.code}
								<span class="text-gray-800 dark:text-gray-200 font-extralight">{stoptime.code}</span
								>
							{/if}

							{#if all_exact_stoptimes == false}
								{#if stoptime.timepoint == true}
									<div class="text-xs inline-block align-middle">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											class="h-4 w-4 text-gray-800 dark:text-gray-300"
											><title>timeline-clock-outline</title>
											<path
												fill="currentColor"
												d="M4 2V8H2V2H4M2 22V16H4V22H2M5 12C5 13.11 4.11 14 3 14C1.9 14 1 13.11 1 12C1 10.9 1.9 10 3 10C4.11 10 5 10.9 5 12M16 4C20.42 4 24 7.58 24 12C24 16.42 20.42 20 16 20C12.4 20 9.36 17.62 8.35 14.35L6 12L8.35 9.65C9.36 6.38 12.4 4 16 4M16 6C12.69 6 10 8.69 10 12C10 15.31 12.69 18 16 18C19.31 18 22 15.31 22 12C22 8.69 19.31 6 16 6M15 13V8H16.5V12.2L19.5 14L18.68 15.26L15 13Z"
											/></svg
										>
									</div>
								{/if}
							{/if}
						</p>

						<StopTimeNumber {show_seconds} {stoptime} {trip_data} {current_time} />

						{#if stoptime.replaced_stop}
							<p>{$_("replaced_stop")}</p>
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

		<!--
			<br/>

			<NativeLands chateau={trip_selected.chateau_id} />

			<br/>-->
	</div>
{/if}
