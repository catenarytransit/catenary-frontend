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
	let fetchtimeout:NodeJS.Timeout |null= null;
	let updatetimecounter :NodeJS.Timeout |null= null;
	let show_previous_stops: boolean = false;
	let bind_scrolling_div: null | HTMLElement = null;

	let stop_id_to_alert_ids: Record<string, string[]> = {};

	let alerts: Record<string, any> = {};

	let last_inactive_stop_idx = 0;
	let last_arrived_stop_idx = -1;

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
				console.log('rt trip data',rt_update_json );

				const data =rt_update_json.data;

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

					//load alerts in
					alerts = trip_data.alert_id_to_alert;

					
					Object.keys(alerts).forEach((alert_id) => {
						let alert = alerts[alert_id];
						alert.informed_entity.forEach((each_entity:any) => {
							if (each_entity.stop_id) {
								if (stop_id_to_alert_ids[each_entity.stop_id] == undefined) {
									stop_id_to_alert_ids[each_entity.stop_id] = [alert_id];
								} else {
									stop_id_to_alert_ids[each_entity.stop_id].push(alert_id);
								}
							}
						});
					})

					console.log('alerts',alerts);

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

		let temp_last_inactive_stop_idx = 0;
		let temp_last_arrived_stop_idx = -1;

		let i = 0;
		stoptimes_cleaned_dataset.forEach((stoptime: any) => {
			if (stoptime.rt_departure_time != null) {
				if (stoptime.rt_departure_time < (current_time / 1000)) {
					temp_last_inactive_stop_idx = i;
				}
			} else {
				if (stoptime.scheduled_departure_time_unix_seconds < (current_time / 1000)) {
					temp_last_inactive_stop_idx = i;
				} else {
					if (stoptime.rt_arrival_time != null) {
						if (stoptime.rt_arrival_time < (current_time / 1000)) {
							temp_last_inactive_stop_idx = i;
						}
					} else {
						if (stoptime.scheduled_arrival_time_unix_seconds < (current_time / 1000)) {
							temp_last_inactive_stop_idx = i;
						}
					}
				}
			}

			if (stoptime.rt_arrival_time != null) {
				if (stoptime.rt_arrival_time < (current_time / 1000)) {
					temp_last_arrived_stop_idx = i;
				}
			} else {
				if (stoptime.scheduled_arrival_time_unix_seconds < (current_time / 1000)) {
					temp_last_arrived_stop_idx = i;
				}
			}

			i = i + 1;
		});

		
		last_inactive_stop_idx = temp_last_inactive_stop_idx;
		last_arrived_stop_idx = temp_last_arrived_stop_idx;
	}, 100);
	});
</script>

<div class="pl-4 sm:pl-2 lg:pl-4 pt-2 h-full">
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
			<div
			
			

			bind:this={bind_scrolling_div}
			class="flex flex-col catenary-scroll overflow-y-auto h-full pb-32">
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
					<p class="text-sm">Trip ID {trip_selected.trip_id}{#if trip_data.block_id != null}
						<span class="text-sm">{" | Block "}{trip_data.block_id}</span>
					{/if}</p>
					
					{#if trip_data.vehicle != null}
						<p class="text-sm">{$_('vehicle')} {trip_data.vehicle.label || trip_data.vehicle.id}</p>
					{/if}
					<p class="text-sm">
						{#if timezones.filter((x) => x!= null).length == 1}
							{$_('timezone')}: {timezones[0]}
						{:else}
							{$_('timezone')}: {timezones.filter((x) => x!=null).join(', ')}
						{/if}
					</p>
					{#if init_loaded != 0}
					
					<div>
						<p class="text-sm">
							{$_("lastupdated")}: 
							<TimeDiff
															diff={init_loaded / 1000 - current_time / 1000}
															show_brackets={false}
														/>
						</p>
					</div>
					{/if}

					{#if alerts != null}
						{#each Object.keys(alerts) as alert_id}
							<div class="bg-yellow-500 bg-opacity-35 leading-snug mr-2 px-1 py-1 rounded-sm">
								{#each alerts[alert_id].header_text.translation as each_header_translation_obj}
								<p class="text-sm  font-bold">{each_header_translation_obj.text}</p>
								{#each alerts[alert_id].description_text.translation.filter(x => x.language == each_header_translation_obj.language)
								 as description_alert}
								 <div class="leading-none">
									{#each description_alert.text.split("\n") as each_desc_line}
								<p class="text-sm">{each_desc_line}</p>
								{/each}
								 </div>
								 {/each}
							{/each}
							</div>
						{/each}
					{/if}
					

					{
						#key trip_data
					}
					{
						#if show_previous_stops && last_inactive_stop_idx > 0
						
					}
					<div class="flex flex-row">
						<div class="flex flex-row">
							<div class="flex flex-col w-2 relative justify-center" style={``}>
								
							</div>
							<div class="mr-3"></div>
							<div on:click={() => {
								show_previous_stops = false;
								
							}}
							class="underline cursor-pointer text-sm text-gray-900 dark:text-gray-100 text-lg font-semibold py-2 lg:py-4 text-base lg:text-lg text-blue-500 dark:text-sky-300"
							>
								Hide previous stops
							</div>
							</div>
					</div>
					{/if}
					{
						#if !show_previous_stops && last_inactive_stop_idx > 0
						
					}
					<div class="flex flex-row">
						<div class="flex flex-row">
							<div class="flex flex-col w-2 relative justify-center" style={``}>
								<div
									style={`background-color: ${trip_data.color};  opacity: 0;`}
									class={`h-1/2`}
								></div>
								<div
									style={`background-color: ${ trip_data.color}; opacity: ${last_inactive_stop_idx > 0 ? 0.5 : 1};`}
									class={`flex-grow rounded-t-full`}
								></div>
								<div
									class="absolute top-1/2 bottom-1/2 left-[1px] w-1.5 h-1.5 rounded-full bg-white"
								></div>
							</div>
							<div class="mr-2"></div>
							<div class="mt-1/2">
								<div on:click={() => {
									show_previous_stops = true;
									
								}}
								class="underline cursor-pointer text-sm text-gray-900 dark:text-gray-100 text-lg font-semibold text-base lg:text-lg text-blue-500 dark:text-sky-300"
								>
									Show {last_inactive_stop_idx} previous stops
								</div>
								{stoptimes_cleaned_dataset[0] == null ? '' : stoptimes_cleaned_dataset[0].name}
							</div>
							</div>
					</div>
					{/if}
					{/key}
					{#each stoptimes_cleaned_dataset as stoptime, i}
					{#if show_previous_stops || i > last_inactive_stop_idx - 1}
					<div class="flex flex-row ">
						<div class="flex flex-col w-2 relative justify-center" style={``}>
							<div
								style={`background-color: ${i != 0 ? trip_data.color : 'transparent'};  opacity: ${last_arrived_stop_idx >= i ? 0.5 : 1};`}
								class={`h-1/2 ${i == trip_data.stoptimes.length - 1 ? 'rounded-b-full' : ''}`}
							></div>
							<div
								style={`background-color: ${i != trip_data.stoptimes.length - 1 ? trip_data.color : 'transparent'}; opacity: ${last_arrived_stop_idx >= i + 1 ? 0.5 : 1};`}
								class={`h-1/2 ${i == 0 ? 'rounded-t-full' : ''}`}
							></div>
							<div
								class="absolute top-1/2 bottom-1/2 left-[1px] w-1.5 h-1.5 rounded-full bg-white"
							></div>
						</div>
						<div class="mr-2"></div>

						<div class="w-full border-t border-slate-500 py-1 pr-1 lg:pr-2">
							<p class="">
								{#if stop_id_to_alert_ids[stoptime.stop_id]}
								<span class="text-amber-500 inline-flex align-middle">
									<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path fill="currentColor" d="m40-120 440-760 440 760H40Zm440-120q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Z"/></svg>
								</span>
								{/if}
								<span class="font-semibold dark:text-gray-100">{fixStationName(stoptime.name)}</span>

								{#if stoptime.code}
								<span class="text-gray-800 dark:text-gray-200">{stoptime.code}</span>
								{/if}
							</p>

							{#if stoptime.schedule_relationship == 1}
								<p class="text-red-700 dark:text-red-300">{$_('cancelled')}</p>
							{/if}


							<div class="flex flex-row">
								<p class="text-sm text-gray-900 dark:text-gray-200">{$_('arrival')}</p>

								{#if stoptime.rt_arrival_diff != null}
									<span class="text-sm ml-1 text-gray-900 dark:text-gray-200">
										<DelayDiff diff={stoptime.rt_arrival_diff} />
									</span>
								{/if}
								<div class="ml-auto text-sm">
									<div class="text-sm text-right">
										<p class="text-right">
											{#if stoptime.scheduled_arrival_time_unix_seconds}
												<span
													class={`${stoptime.strike_arrival == true ? 'text-slate-600 dark:text-gray-400 line-through' : ''}`}
												>
													{new Date(
														stoptime.scheduled_arrival_time_unix_seconds * 1000
													).toLocaleTimeString('en-UK', {
														timeZone: stoptime.timezone || trip_data.tz
													})}
												</span>
											{/if}

											{#if stoptime.rt_arrival_time}
												<span class="text-sky-700 dark:text-sky-300">
													{new Date(stoptime.rt_arrival_time * 1000).toLocaleTimeString('en-UK', {
														timeZone: stoptime.timezone || trip_data.tz
													})}
												</span>
											{/if}
										</p>
										<p class="ml-auto text-right">
											{#if stoptime.rt_arrival_time != null || stoptime.scheduled_arrival_time_unix_seconds != null}
												<TimeDiff
													diff={(stoptime.rt_arrival_time ||
														stoptime.scheduled_arrival_time_unix_seconds) -
														current_time / 1000}
												/>
											{/if}
										</p>
									</div>
								</div>
							</div>

							<div class="flex flex-row">
								<p class="text-sm text-gray-900 dark:text-gray-200">{$_('departure')}</p>
								{#if stoptime.rt_departure_diff != null}
									<span class="text-sm ml-1 text-gray-900 dark:text-gray-200">
										<DelayDiff diff={stoptime.rt_departure_diff} /></span
									>
								{/if}
								<div class="ml-auto text-sm">
									<div class="text-sm text-right">
										<p class="text-right">
											{#if stoptime.scheduled_departure_time_unix_seconds}
												<span
													class={`${stoptime.strike_departure == true ? 'text-slate-600 dark:text-gray-400 line-through' : ''}`}
												>
													{new Date(
														stoptime.scheduled_departure_time_unix_seconds * 1000
													).toLocaleTimeString('en-UK', {
														timeZone: stoptime.timezone || trip_data.tz
													})}
												</span>
											{/if}

											{#if stoptime.rt_departure_time}
												<span class="text-sky-700 dark:text-sky-300">
													{new Date(stoptime.rt_departure_time * 1000).toLocaleTimeString(
														'en-UK',
														{ timeZone: stoptime.timezone || trip_data.tz }
													)}
												</span>
											{/if}
										</p>
										<p class="ml-auto text-right">
											{#if stoptime.rt_departure_time != null || stoptime.scheduled_departure_time_unix_seconds != null}
										{#if !(stoptime.rt_departure_time == null && stoptime.strike_departure == true)}
										<TimeDiff
										diff={(stoptime.rt_departure_time ||
											stoptime.scheduled_departure_time_unix_seconds) -
											current_time / 1000}
									/>
										{/if}
											{/if}
										</p>
									</div>
								</div>
							</div>
							{#if timezones.filter((x) => x!= null).length > 1}
							<p class="text-sm text-gray-900 dark:text-gray-100">{$_("timezone")}: {stoptime.timezone || trip_data.tz }</p>
							{/if}

							<!--<p class="text-sm">
									index of stop seq: {stoptime.gtfs_stop_sequence}
								</p>-->
						</div>
					</div>
					{/if}
						
					{/each}
				{/if}
			</div>
		{/if}
</div>
