<script lang="ts">
	import { json } from '@sveltejs/kit';
	import { SingleTrip } from '../components/stackenum';
	import { onMount } from 'svelte';
	let is_loading_trip_data: boolean = true;
	let trip_data: Record<string, any> | null = null;
	let init_loaded = 0;
	let timezones: string[] = [];
	let error: string | null = '';
    let stoptimes_cleaned_dataset:Array<Record<string, any>> = [];
	export let trip_selected: SingleTrip;

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

                    let stoptimes_cleaned:any[] = [];

                    let index = 0;
                    data.stoptimes.forEach((stoptime:any) => {
                        if (timezones.indexOf(stoptime.timezone) === -1) {
								timezones.push(stoptime.timezone);
							}

                            let stoptime_to_use = {...stoptime};

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
                    
                    console.log('stoptimes_cleaned_dataset',stoptimes_cleaned_dataset);
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
			{#each [0,1,2,3,4,5,6,7,8] as it}
            <div class='border-t w-full border-slate-200 dark:border-slate-700 py-3 flex flex-col gap-y-2'>
                <div class='h-5 w-1/2 rounded-full bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse'></div>
                <div class='h-3 w-1/4 rounded-full bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse'></div>
                <div class='h-3 w-2/5 rounded-full bg-slate-400 dark:bg-slate-800 rounded-lg animate-pulse'></div>
            </div>
            {/each}
		{:else}
			<div class="flex flex-col catenary-scroll overflow-y-auto h-full pb-32">
				{#if trip_data != null}
                    <p>
                    {#if trip_data.trip_short_name != null}
                    <span class="text-lg rounded-lg py-[0.7px] px-1" style={`background: ${trip_data.color}; color: ${trip_data.text_color}`}>{trip_data.trip_short_name}</span>
                    {/if}
                    {#if trip_data.route_short_name != null}
                    <span class="text-lg font-bold" style={`color: ${trip_data.color};`}>{trip_data.route_short_name}</span>
                    {/if}
                    {#if trip_data.route_long_name != null}
                    <span class="text-lg"  style={`color: ${trip_data.color};`}>{trip_data.route_long_name}</span>
                    {/if}
                    </p>
                    <p class="">Trip ID {trip_selected.trip_id}</p>
                    {#if trip_data.block_id != null}
                    <p class="">Block {trip_data.block_id}</p>
                    {/if}
					<p>
						{#if timezones.length == 1}
							Timezone: {timezones[0]}
						{:else}
							Timezones: {timezones.join(', ')}
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
								<p class=""><span class="font-bold">{stoptime.name}</span></p>
                               
									<div class="flex flex-row">
										<p class="text-sm">Arrival</p>
										<div class="ml-auto text-sm">
											<div class="text-sm">
                                                {#if stoptime.scheduled_arrival_time_unix_seconds}
												<p class={`${stoptime.has_rt_arrival_time == true ? "text-slate-600 dark:text-gray-400 line-through" : ""}`}>
                                                    {new Date(
                                                        stoptime.scheduled_arrival_time_unix_seconds * 1000
                                                    ).toLocaleTimeString('en-UK', {
                                                        timeZone: stoptime.timezone || trip_data.timezone
                                                    })}
                                                </p>
                                                {/if}
                                                {#if stoptime.rt_arrival?.time}
                                                    <p>
                                                        {new Date(stoptime.rt_arrival?.time * 1000).toLocaleTimeString(
                                                            'en-UK',
                                                            { timeZone: stoptime.timezone || trip_data.timezone }
                                                        )}
                                                    </p>
                                                {/if}
                                                </div>
										</div>
									</div>
								
								{#if stoptime.scheduled_departure_time_unix_seconds}
									<div class="flex flex-row">
										<div><p class="text-sm">Departure</p></div>
										<div class="ml-auto text-sm">
											<p class={`${stoptime.has_rt_departure_time == true ? "text-slate-600 dark:text-gray-400 line-through" : ""}`}>
												{new Date(
													stoptime.scheduled_departure_time_unix_seconds * 1000
												).toLocaleTimeString('en-UK', {
													timeZone: stoptime.timezone || trip_data.timezone
												})}
											</p>
											{#if stoptime.rt_departure?.time}
												<p>
													{new Date(stoptime.rt_departure?.time * 1000).toLocaleTimeString(
														'en-UK',
														{ timeZone: stoptime.timezone || trip_data.timezone }
													)}
												</p>
											{/if}
										</div>
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
