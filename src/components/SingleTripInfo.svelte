<script lang="ts">
	import { json } from '@sveltejs/kit';
	import { SingleTrip } from '../components/stackenum';
	import { onMount } from 'svelte';
	import { locale, locales } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
	import { _ } from 'svelte-i18n';
	import RouteIcon from './RouteIcon.svelte';
	import { lightenColour } from './lightenDarkColour';
	import DelayDiff from './DelayDiff.svelte';
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
	export let trip_selected: SingleTrip;

	export let darkMode: boolean = false;

	async function fetch_trip_selected() {
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

					let stoptimes_cleaned: any[] = [];

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

						stoptimes_cleaned.push(stoptime_to_use);
						index = index + 1;
					});

					if (trip_selected.chateau_id == 'irvine~ca~us') {
						stoptimes_cleaned.sort((a, b) => a.rt_arrival_time - b.rt_arrival_time);
					}

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
</script>

<div class="pl-4 sm:pl-2 lg:pl-4 pt-2 h-full">
	{#key init_loaded}
		{#if error != null}
			{error}
		{:else if is_loading_trip_data}
			{#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as it}
				<div
					class="border-t w-full border-slate-200 dark:border-slate-700 py-3 flex flex-col gap-y-2"
				>
					<div class="h-5 w-1/2 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
					<div class="h-3 w-1/4 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
					<div class="h-3 w-2/5 bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"></div>
				</div>
			{/each}
		{:else}
			<div class="flex flex-col catenary-scroll overflow-y-auto h-full pb-32">
				{#if trip_data != null}
					{#if trip_data.route_long_name || trip_data.route_short_name}
						<span
							style={`color: ${darkMode ? lightenColour(trip_data.color) : trip_data.color}`}
							class="text-xl mt-0"
						>
							{#if fixRunNumber(trip_selected.chateau_id, trip_selected.route_type || 3, trip_data.route_id, trip_data.trip_short_name, trip_data.vehicle_id)}
								<span
									style={`background-color: ${trip_data.color}; color: ${trip_data.text_color};`}
									class="font-bold text-md px-1 py-0.5 mr-1 rounded-md w-min"
									>{fixRunNumber(
										trip_selected.chateau_id,
										trip_selected.route_type || 3,
										trip_data.route_id,
										trip_data.trip_short_name,
										trip_data.vehicle_id
									)}</span
								>
							{/if}
							{#if trip_data.route_long_name && trip_data.route_short_name && !trip_data.route_long_name.includes(trip_data.route_short_name)}
								<span class="font-bold"
									>{fixRouteName(
										trip_selected.chateau_id,
										trip_data.route_short_name,
										trip_data.route_id
									)}</span
								>
								<span class="font-normal ml-1"
									>{fixRouteNameLong(
										trip_selected.chateau_id,
										trip_data.route_long_name,
										trip_data.route_id
									)}</span
								>
							{:else}
								<span class="font-semibold"
									>{trip_data.route_long_name
										? fixRouteNameLong(
												trip_selected.chateau_id,
												trip_data.route_long_name,
												trip_data.route_id
											)
										: fixRouteName(
												trip_selected.chateau_id,
												trip_data.route_short_name,
												trip_data.route_id
											)}</span
								>
							{/if}
						</span>
					{/if}
					{#if trip_data.trip_headsign}
						<!--{#if fixRouteIcon(trip_selected.chateau_id, trip_data.route_id)}
								<img
									alt={trip_data.route_id}
									class="inline w-5 h-auto mr-0.5 align-middle"
									style={!darkMode ? 'filter: invert(1)' : ''}
									src={fixRouteIcon(trip_selected.chateau_id, trip_data.route_id)}
								/>
							{:else}
                                {#if trip_selected.route_type != null}
								<span class="align-middle text-sm">
                                    <RouteIcon
                                route_type={trip_selected.route_type}
                                />
                                </span>
                                {/if}				
							{/if}-->
						<p class="text-lg font-semibold mt-0 lg:mt-1">
							{'→'}
							{fixHeadsignText(
								trip_data.trip_headsign,
								trip_data.route_short_name || trip_data.route_long_name
							)}
							{#if fixHeadsignIcon(trip_data.trip_headsign)}
								<span class="material-symbols-outlined text-lg align-bottom"
									>{fixHeadsignIcon(trip_data.trip_headsign)}</span
								>
							{/if}
						</p>
					{/if}
					<span class="block mt-0 mt-1" />
					<p class="text-sm">Trip ID {trip_selected.trip_id}</p>
					{#if trip_data.block_id != null}
						<p class="text-sm">Block {trip_data.block_id}</p>
					{/if}
					{#if trip_data.vehicle != null}
						<p class="text-sm">{$_('vehicle')} {trip_data.vehicle.label || trip_data.vehicle.id}</p>
					{/if}
					<p class="text-sm">
						{#if timezones.length == 1}
							{$_('timezone')}: {timezones[0]}
						{:else}
							{$_('timezone')}: {timezones.join(',')}
						{/if}
					</p>
					{#each stoptimes_cleaned_dataset as stoptime, i}
						<div class="flex flex-row">
							<div class="flex flex-col w-2 relative justify-center" style={``}>
								<div
									style={`background: ${i != 0 ? trip_data.color : 'transparent'}`}
									class={`h-1/2 ${i == trip_data.stoptimes.length - 1 ? 'rounded-b-full' : ''}`}
								></div>
								<div
									style={`background: ${i != trip_data.stoptimes.length - 1 ? trip_data.color : 'transparent'}`}
									class={`h-1/2 ${i == 0 ? 'rounded-t-full' : ''}`}
								></div>
								<div
									class="absolute top-1/2 bottom-1/2 left-[1px] w-1.5 h-1.5 rounded-full bg-white"
								></div>
							</div>
							<div class="mr-2"></div>

							<div class="w-full border-t border-slate-500 py-1 pr-1 lg:pr-2">
								<p class=""><span class="font-bold dark:text-gray-100">{fixStationName(stoptime.name)}</span></p>

								{#if stoptime.schedule_relationship == 1}
									<p class="text-red-700 dark:text-red-300">{$_('cancelled')}</p>
								{/if}

								<div class="flex flex-row">
									<p class="text-sm text-gray-900 dark:text-gray-200">{$_('arrival')}</p>

									{#if stoptime.rt_arrival_diff != null}
										<span class="text-sm ml-1  text-gray-900 dark:text-gray-200">
											<DelayDiff diff={stoptime.rt_arrival_diff} />
										</span>
									{/if}
									<div class="ml-auto text-sm">
										<div class="text-sm">
											<p>
												{#if stoptime.scheduled_arrival_time_unix_seconds}
													<span
														class={`${stoptime.strike_arrival == true ? 'text-slate-600 dark:text-gray-400 line-through' : ''}`}
													>
														{new Date(
															stoptime.scheduled_arrival_time_unix_seconds * 1000
														).toLocaleTimeString('en-UK', {
															timeZone: stoptime.timezone || trip_data.timezone
														})}
													</span>
												{/if}

												{#if stoptime.rt_arrival_time}
													<span class="text-sky-700 dark:text-sky-300">
														{new Date(stoptime.rt_arrival_time * 1000).toLocaleTimeString('en-UK', {
															timeZone: stoptime.timezone || trip_data.timezone
														})}
													</span>
												{/if}
											</p>
										</div>
									</div>
								</div>

								<div class="flex flex-row">
									<p class="text-sm  text-gray-900 dark:text-gray-200">{$_('departure')}</p>
									{#if stoptime.rt_departure_diff != null}
										<span class="text-sm ml-1  text-gray-900 dark:text-gray-200">
											<DelayDiff diff={stoptime.rt_departure_diff} /></span
										>
									{/if}
									<div class="ml-auto text-sm">
										<div class="text-sm">
											<p>
												{#if stoptime.scheduled_departure_time_unix_seconds}
													<span
														class={`${stoptime.strike_departure == true ? 'text-slate-600 dark:text-gray-400 line-through' : ''}`}
													>
														{new Date(
															stoptime.scheduled_departure_time_unix_seconds * 1000
														).toLocaleTimeString('en-UK', {
															timeZone: stoptime.timezone || trip_data.timezone
														})}
													</span>
												{/if}

												{#if stoptime.rt_departure_time}
													<span class="text-sky-700 dark:text-sky-300">
														{new Date(stoptime.rt_departure_time * 1000).toLocaleTimeString(
															'en-UK',
															{ timeZone: stoptime.timezone || trip_data.timezone }
														)}
													</span>
												{/if}
											</p>
										</div>
									</div>
								</div>
								<!--<p class="text-sm">
										index of stop seq: {stoptime.gtfs_stop_sequence}
									</p>-->
							</div>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	{/key}
</div>
