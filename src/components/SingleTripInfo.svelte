<script lang="ts">
	import { json } from '@sveltejs/kit';
	import { SingleTrip } from '../components/stackenum';
	import { onMount } from 'svelte';
	import { locale, locales } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
	import { _ } from 'svelte-i18n';
	import { lightenColour } from './lightenDarkColour';
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

						let stoptime_to_use = { ...stoptime, strike_departure: false, strike_arrival: false };

						if (stoptime_to_use.rt_arrival?.time) {
							stoptime_to_use.rt_arrival_time = stoptime_to_use.rt_arrival?.time;
							stoptime_to_use.strike_arrival = true;
						}

						if (stoptime_to_use.rt_departure?.time) {
							stoptime_to_use.rt_departure_time = stoptime_to_use.rt_departure?.time;
							stoptime_to_use.strike_departure = true;

							if (stoptime_to_use.rt_arrival?.time) {
								if (stoptime_to_use.rt_arrival?.time > stoptime_to_use.rt_departure?.time) {
									stoptime_to_use.rt_arrival_time = stoptime_to_use.rt_departure?.time;

									stoptime_to_use.strike_arrival = true;
								}
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
					<div
						class="h-5 w-1/2 rounded-full bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"
					></div>
					<div
						class="h-3 w-1/4 rounded-full bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"
					></div>
					<div
						class="h-3 w-2/5 rounded-full bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse"
					></div>
				</div>
			{/each}
		{:else}
			<div class="flex flex-col catenary-scroll overflow-y-auto h-full pb-32">
				{#if trip_data != null}
					{#if trip_data.route_long_name || trip_data.route_short_name}
						<span
							style={`color: ${darkMode ? lightenColour(trip_data.color) : trip_data.color}`}
							class="text-xl mt-1"
						>
							{#if fixRunNumber(trip_selected.chateau_id, trip_data.route_type, trip_data.route_id, trip_data.trip_short_name, trip_data.vehicle_id)}
								<span
									style={`background-color: ${trip_data.color}; color: ${trip_data.text_color};`}
									class="font-bold text-md px-1 py-0.5 mr-1 rounded-md w-min"
									>{fixRunNumber(
										trip_selected.chateau_id,
										trip_data.route_type,
										trip_data.route_id,
										trip_data.trip_short_name,
										trip_data.vehicle_id
									)}</span
								>
							{/if}
							{#if fixRouteIcon(trip_selected.chateau_id, trip_data.route_id)}
								<img
									alt={trip_data.route_id}
									class="inline h-8 w-8 mr-1 align-middle mb-1"
									src={fixRouteIcon(trip_selected.chateau_id, trip_data.route_id)}
								/>
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
						<p class="text-lg font-semibold">
							&rarr; {fixHeadsignText(trip_data.trip_headsign)}
							{#if fixHeadsignIcon(trip_data.trip_headsign)}
								<span class="material-symbols-outlined text-lg align-bottom"
									>{fixHeadsignIcon(trip_data.trip_headsign)}</span
								>
							{/if}
						</p>
					{/if}
					<span class="block my-1" />
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

							<div class="w-full border-t border-slate-500 py-2 pr-1 lg:pr-2">
								<p class=""><span class="font-bold">{fixStationName(stoptime.name)}</span></p>

								<div class="flex flex-row">
									<p class="text-sm">{$_('arrival')}</p>
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
													<span class="text-sky-500">
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
									<p class="text-sm">{$_('departure')}</p>
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
													<span class="text-sky-500">
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

								{#if timezones.length > 1}
									<p class="text-sm">
										Tz: {stoptime.timezone || trip_data.timezone}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	{/key}
</div>