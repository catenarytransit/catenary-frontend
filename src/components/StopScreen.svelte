<script lang="ts">
	import { onMount } from 'svelte';
	import HomeButton from './SidebarParts/home_button.svelte';

    export let chateau: string;
    export let stop_id: string;
	import TimeDiff from './TimeDiff.svelte';
    
	import DelayDiff from './DelayDiff.svelte';
    import {_} from "svelte-i18n";
	import Clock from './Clock.svelte';
    let events_filtered = [];

    let current_time = 0;

    let interval_fetch: NodeJS.Timeout | null = null;
    let data_from_server = null;

    function fetch_stop_data() {
        console.log('Fetching data for chateau:', chateau, 'stop_id:', stop_id);
      

        fetch("https://birch.catenarymaps.org/departures_at_stop?stop_id=" + stop_id + "&chateau_id=" + chateau, {
            mode: 'cors'
        })
            .then(response => response.json())
            .then(data => {
                console.log('Fetched data:', data);

                data_from_server = data;

               

                if (data.events) {
                    events_filtered = data_from_server.events.filter((event) => (event.realtime_departure || event.scheduled_departure) > ((Date.now() / 1000) - 600))

                   // events_filtered.sort((a,b) => (a.realtime_departure || a.scheduled_departure) - (b.realtime_departure || b.scheduled_departure))
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            })
    }

    onMount(() => {
        fetch_stop_data();
        
        current_time = Date.now();

        setInterval(() => {
             current_time = Date.now();
        }, 500);

        interval_fetch = setInterval(() => {fetch_stop_data()}, 10000);

        () => {
            if (interval_fetch) {
                clearInterval(interval_fetch);
            }
        }
    });

    $: if (chateau || stop_id) fetch_stop_data();
    
    </script>

<div class='h-full'>
    <HomeButton />
    	<div class=" catenary-scroll overflow-y-auto pb-64 h-full pr-2">
		<div class="flex flex-col">
		<div>
            {#if data_from_server}

            {#if events_filtered} 


                {#each events_filtered as event }

                    <div class="mx-1 my-2 border-b-1 border-gray-500">


<p>{event.headsign}</p>

                      <div class="flex flex-row">
                          Departure:
                        <TimeDiff
													large={false}
													show_brackets={false}
													show_seconds={false}
													diff={(event.realtime_departure || event.scheduled_departure) -
														current_time / 1000}
												/>

                                                
                                                <div class={`ml-auto`}>
                                                    <Clock
                                                    timezone = {data_from_server.primary.timezone}
                                                    time_seconds = {event.realtime_departure || event.scheduled_departure}
                                                    />
                                                </div>
                                                    </div>

                    {#if event.platform_string_realtime} 

                    <p>{event.platform_string_realtime} </p>
                    {/if}

                    {#if event.vehicle_number} 
                    <p>{$_("vehicle")}: {event.vehicle_number}</p>
                    {/if}

                    </div>
                    <br/>

                {/each}

               

                
            {/if}

        {:else}
            <p>Loading...</p>
        {/if}
        </div>
    </div>
</div></div>