<script lang="ts">
	import { onMount } from 'svelte';
	import HomeButton from './SidebarParts/home_button.svelte';

	import { writable, get } from 'svelte/store';
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
	import { _ } from 'svelte-i18n';
	import Clock from './Clock.svelte';
	import StopScreenRow from './StopScreenRow.svelte';
	import { SingleTrip, StackInterface } from './stackenum';

	let show_seconds = get(show_seconds_store);

	show_seconds_store.subscribe((value) => {
		show_seconds = value;
	});

	let events_filtered = [];

	let current_time = 0;

	let interval_fetch: NodeJS.Timeout | null = null;
	let data_from_server = null;

	function fetch_stop_data() {
		console.log('Fetching data for chateau:', chateau, 'stop_id:', stop_id);

		fetch(
			'https://birch.catenarymaps.org/departures_at_stop?stop_id=' +
				stop_id +
				'&chateau_id=' +
				chateau,
			{
				mode: 'cors'
			}
		)
			.then((response) => response.json())
			.then((data) => {
				console.log('Fetched data:', data);

				data_from_server = data;

				if (data.events) {
					events_filtered = data_from_server.events.filter(
						(event) =>
							(event.realtime_departure || event.scheduled_departure) > Date.now() / 1000 - 600
					);

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

		() => {
			if (interval_fetch) {
				clearInterval(interval_fetch);
			}
		};
	});

	$: if (chateau || stop_id) fetch_stop_data();
</script>

<div class="h-full">
	<HomeButton />
	<div class=" catenary-scroll overflow-y-auto pb-64 h-full pr-2">

		<div class="flex flex-col">
			<div>
				{#if data_from_server}

                <h2 class="text-lg font-bold">{data_from_server.primary.stop_name}</h2>

					{#if events_filtered}
						{#each events_filtered as event}
							<div class="mx-1 py-1 border-b-1 border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
							on:click={() => {
								data_stack_store.update((x) => {
									x.push(new StackInterface (
										new SingleTrip(
											event.chateau,
											event.trip_id,
											event.route_id,
											null,
											event.trip_service_date,
											null,
											null
										)
									));
									return x;
								});
							}}
							>
								<div class={` ${((event.realtime_departure || event.scheduled_departure) < current_time / 1000) && (event.scheduled_departure < current_time / 1000) ? "opacity-80" : ""}`}>
									<p>
										{#if data_from_server.routes[event.chateau][event.route_id].short_name}
										<span class="rounded-xs font-bold px-0.5 mx-1 py-0.5"
										style={`background: ${data_from_server.routes[event.chateau][event.route_id].color};
										color: ${data_from_server.routes[event.chateau][event.route_id].text_color};
										`}
										>{data_from_server.routes[event.chateau][event.route_id].short_name}</span>
										{:else}
										{#if data_from_server.routes[event.chateau][event.route_id].long_name}
										<span class="rounded-xs font-semibold px-0.5 mx-1 py-0.5"
										style={`background: ${data_from_server.routes[event.chateau][event.route_id].color};
										color: ${data_from_server.routes[event.chateau][event.route_id].text_color};
										`}
										>{data_from_server.routes[event.chateau][event.route_id].long_name}</span>
										{/if}
										{/if}
{#if event.trip_short_name}
										<span class="font-bold"
										>{event.trip_short_name}</span>
										{/if}

										{event.headsign}</p>
								</div>

								<StopScreenRow event={event}
								data_from_server={data_from_server}
								current_time={current_time}
								show_seconds={show_seconds}
								/>

								{#if event.platform_string_realtime}
									<p>{event.platform_string_realtime}</p>
								{/if}

								{#if event.vehicle_number}
									<p>{$_('vehicle')}: {event.vehicle_number}</p>
								{/if}
							</div>
						{/each}
					{/if}
				{:else}
					<p>Loading...</p>
				{/if}
			</div>
		</div>
	</div>
</div>
