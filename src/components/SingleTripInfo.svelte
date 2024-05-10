<script lang="ts">
	import { json } from '@sveltejs/kit';
	import { SingleTrip } from '../components/stackenum';
	import { onMount } from 'svelte';
	import { locale, locales } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
	import { _ } from 'svelte-i18n';
	import { fixHeadsignIcon, fixRouteName, fixRunNumber, fixStationName, fixStationNameLong } from './agencyspecific';
	import { lightenColour } from './lightenDarkColour';
	import TimeDisplay from './TimeDisplay.svelte';
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
			console.log('trip_id', trip_selected.trip_id);
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

						let stoptime_to_use = { ...stoptime };

						if (stoptime_to_use.rt_departure?.time) {
							stoptime_to_use.has_rt_departure_time = true;
						} else {
							stoptime_to_use.has_rt_departure_time = false;
						}

						if (stoptime_to_use.rt_arrival?.time) {
							stoptime_to_use.has_rt_arrival_time = true;
						} else {
							stoptime_to_use.has_rt_arrival_time = false;
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

	function timesEqualToMinute(time1: number, time2: number) {
		let date1 = new Date(time1 * 1000);
		let date2 = new Date(time2 * 1000);

		return date1.getMinutes() == date2.getMinutes() && date1.getHours() == date2.getHours();
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
					{#if trip_data.route_short_name || trip_data.route_long_name}
						<div
							style={`background-color: ${trip_data.color}; color: ${trip_data.text_color};`}
							class="font-bold px-1 py-0.5 rounded-sm mr-1 text-md"
						>
							{fixRouteName(
								trip_selected.chateau_id,
								trip_data.route_short_name || trip_data.route_long_name
							)}{trip_data.trip_headsign.startsWith('A ')
								? 'A'
								: ''}{#if fixRunNumber(trip_selected.chateau_id, trip_data.route_type)}&nbsp;<span
									class="font-light font-mono"
									>#{trip_data.trip_short_name ||
										trip_data.block_id ||
										trip_data.vehicle_id}</span
								>{/if}
						</div>
					{/if}
					{#if trip_data.trip_headsign}
						<span
							class="font-semibold"
							style={`color: ${darkMode ? lightenColour(trip_data.colour) : trip_data.colour}`}
						>
							{trip_data.trip_headsign.startsWith('A ')
								? fixStationName(trip_data.trip_headsign).slice(1)
								: fixStationName(trip_data.trip_headsign)}
							{#if fixHeadsignIcon(trip_data.trip_headsign)}
								<span class="material-symbols-outlined text-sm"
									>{fixHeadsignIcon(trip_data.trip_headsign)}</span
								>
							{/if}
						</span>
					{/if}

					<p class="">Trip ID {trip_selected.trip_id}</p>
					{#if trip_data.block_id != null}
						<p class="">Block {trip_data.block_id}</p>
					{/if}
					{#if trip_data.vehicle != null}
						<p class="">{$_('vehicle')} {trip_data.vehicle.label}</p>
					{/if}
					<p>
						{#if timezones.length == 1}
							{$_('timezone')} {timezones[0]}
						{:else}
							{$_('timezone')} {timezones.join(',')}
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

							<div class="w-full py-3 pr-1 lg:pr-2">
								<div class="flex flex-row">
									<p class=""><span class="font-bold">{fixStationNameLong(stoptime.name)}</span></p>
									{#if timesEqualToMinute(stoptime.scheduled_arrival_time_unix_seconds, stoptime.scheduled_departure_time_unix_seconds)}
										<TimeDisplay scheduled={stoptime.scheduled_arrival_time_unix_seconds} actual={stoptime.rt_arrival?.time} timezone={stoptime.timezone || trip_data.timezone} />
									{/if}
								</div>


								{#if !timesEqualToMinute(stoptime.scheduled_arrival_time_unix_seconds, stoptime.scheduled_departure_time_unix_seconds)}
									<div class="flex flex-row">
										<p class="text-sm">{$_('arrival')}</p>
										<TimeDisplay scheduled={stoptime.scheduled_arrival_time_unix_seconds} actual={stoptime.rt_arrival?.time} timezone={stoptime.timezone || trip_data.timezone} />
									</div>

									<div class="flex flex-row">
										<p class="text-sm">{$_('departure')}</p>
										<TimeDisplay scheduled={stoptime.scheduled_departure_time_unix_seconds} actual={stoptime.rt_departure?.time} timezone={stoptime.timezone || trip_data.timezone} />
									</div>
								{/if}

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
