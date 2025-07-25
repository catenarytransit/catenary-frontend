<script lang="ts">
	import { onMount } from 'svelte';
	import HomeButton from './SidebarParts/home_button.svelte';
	import maplibregl from 'maplibre-gl';
	import polyline from '@mapbox/polyline';
	import { writable, get } from 'svelte/store';
	import { timezone_to_locale } from './timezone_to_locale';
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
	export let chateau: string;
	export let stop_id: string;
	import TimeDiff from './TimeDiff.svelte';

	import DelayDiff from './DelayDiff.svelte';
	import { getLocaleFromNavigator, locale, locales, _ } from 'svelte-i18n';
	import Clock from './Clock.svelte';
	import StopScreenRow from './StopScreenRow.svelte';
	import { SingleTrip, StackInterface } from './stackenum';

	import jsonwebworkerpkg from '@cheprasov/json-web-worker';
	const { jsonWebWorker, parse, stringify } = jsonwebworkerpkg;

	let show_seconds = get(show_seconds_store);

	let locale_inside_component = get(locale);

	show_seconds_store.subscribe((value) => {
		show_seconds = value;
	});

	let events_filtered = [];

	let dates_to_events_filtered = {};

	let date_formatted = {};

	let current_time = 0;

	let interval_fetch: NodeJS.Timeout | null = null;
	let data_from_server = null;

	let last_stop_id_fetched = "";

	function fetch_stop_data() {
		console.log('Fetching data for chateau:', chateau, 'stop_id:', stop_id);

		let global_map_pointer = get(map_pointer_store);

		fetch(
			'https://birch.catenarymaps.org/departures_at_stop?stop_id=' +
				stop_id +
				'&chateau_id=' +
				chateau,
			{
				mode: 'cors'
			}
		)
			.then((response) => response.text())
			.then((text) => jsonWebWorker.parse(text))
			.then((data) => {
				//	console.log('Fetched data:', data);

				data_from_server = data;

				if (data.events) {
					events_filtered = data_from_server.events.filter(
						(event) =>
							(event.realtime_departure || event.scheduled_departure) > Date.now() / 1000 - 600
					);

					for (const event of events_filtered) {
						//console.log('event', event);

						let date_ca = new Date(
							(event.realtime_departure ||
								event.realtime_arrival ||
								event.scheduled_departure ||
								event.scheduled_arrival) * 1000
						).toLocaleDateString('en-CA', {
							timeZone: data_from_server.primary.timezone
						});

						//	console.log('canadian date format',date_ca)

						if (dates_to_events_filtered[date_ca] == undefined) {
							dates_to_events_filtered[date_ca] = [];
						}

						dates_to_events_filtered[date_ca].push(event);
					}

					//console.log(dates_to_events_filtered);

					global_map_pointer.flyTo({
						center: [
										data_from_server.primary.stop_lon,
										data_from_server.primary.stop_lat
									],
									zoom: 14
					})

					global_map_pointer.getSource('redpin').setData({
						type: 'FeatureCollection',
						features: [
							{
								type: 'Feature',
								properties: {},
								geometry: {
									coordinates: [
										data_from_server.primary.stop_lon,
										data_from_server.primary.stop_lat
									],
									type: 'Point'
								}
							}
						]
					});

					//console.log(data_from_server.routes);

					let geojson_shapes_list = [];

					for (const [chateau_id, routes] of Object.entries(data_from_server.routes)) {
						for (const [route_id, route] of Object.entries(routes)) {
							for (const shape_id of route.shapes_list) {
								if (data_from_server.shapes[chateau_id]) {
									if (data_from_server.shapes[chateau_id][shape_id]) {
										geojson_shapes_list.push({
											geometry: polyline.toGeoJSON(data_from_server.shapes[chateau_id][shape_id]),
											properties: {
												color: route.color
											}
										});
									}
								}
							}
						}
					}

					global_map_pointer.getSource('transit_shape_context_for_stop').setData({
						type: 'FeatureCollection',
						features: geojson_shapes_list
					});

					global_map_pointer.getSource('transit_shape_context').setData({
						type: 'FeatureCollection',
						features: []
					});

					global_map_pointer.getSource('stops_context').setData({
						type: 'FeatureCollection',
						features: []
					});

					// events_filtered.sort((a,b) => (a.realtime_departure || a.scheduled_departure) - (b.realtime_departure || b.scheduled_departure))
				}
			})
			.catch((error) => {
				console.error('Error fetching data:', error);
			});
	}

	onMount(() => {
		fetch_stop_data();

		current_time = Date.now();

		setInterval(() => {
			current_time = Date.now();
		}, 500);

		interval_fetch = setInterval(() => {
			fetch_stop_data();
		}, 10000);

		return () => {
			let global_map_pointer = get(map_pointer_store);

			if (interval_fetch) {
				clearInterval(interval_fetch);

				global_map_pointer.getSource('redpin').setData({
					type: 'FeatureCollection',
					features: []
				});
			}
		};
	});

	$: if (chateau || stop_id) fetch_stop_data();

	$: if (stop_id) {
		fetch_stop_data();
	}
</script>

<div class="h-full">
	<HomeButton />
	<div class=" catenary-scroll overflow-y-auto pb-64 h-full pr-2">
		<div class="flex flex-col">
			<div>
				{#if data_from_server}
					<div class="flex flex-row ml-1">
						<h2 class="text-lg font-bold">{data_from_server.primary.stop_name}</h2>

						<p class="ml-auto align-middle">
							<Clock
								time_seconds={current_time / 1000}
								show_seconds={true}
								timezone={data_from_server.primary.timezone}
							/>
						</p>
					</div>

					<p class="text-sm ml-1">{data_from_server.primary.timezone}</p>

					{#if dates_to_events_filtered}
						{#each Object.keys(dates_to_events_filtered) as date_code}
							<p class="text-md font-semibold mt-3 mb-1 mx-3">
								{new Date(date_code).toLocaleDateString(
									timezone_to_locale(locale_inside_component, data_from_server.primary.timezone),
									{
										year: 'numeric',
										month: 'numeric',
										day: 'numeric',
										weekday: 'long',
										timeZone: 'UTC'
									}
								)}
							</p>

							{#each dates_to_events_filtered[date_code] as event}
								<div
									class="mx-1 py-1 border-b-1 border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
									on:click={() => {
										data_stack_store.update((x) => {
											x.push(
												new StackInterface(
													new SingleTrip(
														event.chateau,
														event.trip_id,
														event.route_id,
														null,
														event.trip_service_date,
														null,
														null
													)
												)
											);
											return x;
										});
									}}
								>
									<div
										class={` ${(event.realtime_departure || event.scheduled_departure) < current_time / 1000 && event.scheduled_departure < current_time / 1000 ? 'opacity-80' : ''}`}
									>
										<p>
											{#if data_from_server.routes[event.chateau][event.route_id].short_name}
												<span
													class="rounded-xs font-bold px-0.5 mx-1 py-0.5"
													style={`background: ${data_from_server.routes[event.chateau][event.route_id].color};
										color: ${data_from_server.routes[event.chateau][event.route_id].text_color};
										`}>{data_from_server.routes[event.chateau][event.route_id].short_name}</span
												>
											{:else if data_from_server.routes[event.chateau][event.route_id].long_name}
												<span
													class="rounded-xs font-semibold px-0.5 mx-1 py-0.5"
													style={`background: ${data_from_server.routes[event.chateau][event.route_id].color};
										color: ${data_from_server.routes[event.chateau][event.route_id].text_color};
										`}>{data_from_server.routes[event.chateau][event.route_id].long_name}</span
												>
											{/if}
											{#if event.trip_short_name}
												<span class="font-bold">{event.trip_short_name}</span>
											{/if}

											{event.headsign}
										</p>

										{#if event.last_stop}
											<p>
												<span class="ml-1 text-xs font-bold align-middle"> {$_('last_stop')}</span>
											</p>
										{/if}
									</div>

									<StopScreenRow {event} {data_from_server} {current_time} {show_seconds} />

									{#if event.platform_string_realtime}
										<p>{event.platform_string_realtime}</p>
									{/if}

									{#if event.vehicle_number}
										<p>{$_('vehicle')}: {event.vehicle_number}</p>
									{/if}
								</div>
							{/each}
						{/each}
					{/if}
				{:else}
					<p>Loading...</p>
				{/if}
			</div>
		</div>
	</div>
</div>
