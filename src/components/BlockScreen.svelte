<script lang="ts">
	import HomeButton from "./SidebarParts/home_button.svelte";
    import {_} from "svelte-i18n";
    import { onMount } from "svelte";
    import Clock from "./Clock.svelte";
	import TimeDiff from "./TimeDiff.svelte";
	import { data_stack_store } from "../globalstores";
    import {StackInterface, SingleTrip} from "./stackenum";

    export let chateau: string;
    export let block_id: string;
    export let service_date: string;

    let trip_duration_seconds = 0;

    let block_data:any = {};
    let loading_done = false;

    let single_route = false;

    let current_time = Math.floor(Date.now() / 1000);

    let interval_timer = setInterval(() => {
        current_time = Math.floor(Date.now() / 1000);
    }, 1000);

    function getData() {
        fetch(`http://birch.catenarymaps.org/get_block?chateau=${chateau}&block_id=${block_id}&service_date=${service_date}`,
            {
                method: 'GET',
                mode: 'cors',
            }
        )
            .then((response) => response.text())
            .then((text) => {
                let data = JSON.parse(text);

                if (data.routes) {
                    single_route = Object.keys(data.routes).length == 1;
                }

                console.log(data);

                if (data) {
                    block_data = data;

                    let first_trip = block_data.trips[0];
                    let last_trip = block_data.trips[block_data.trips.length - 1];

                    trip_duration_seconds = last_trip.end_time - first_trip.start_time;
                } else {
                    block_data = null;
                }
                loading_done = true;
            });
    }

    $: if (block_id) {
        getData();
    }

    $: if (service_date) {
        getData();
    }

    onMount(() => {
       getData();

       () => {
           clearInterval(interval_timer);
       };
    });
</script>

<HomeButton/>

<div class="px-3 catenary-scroll overflow-y-auto grow">
    

    {#if single_route}
    <p>

        {#if block_data.routes[Object.keys(block_data.routes)[0]].short_name}
        <span class='font-semibold' style='color:{block_data.routes[Object.keys(block_data.routes)[0]].color}'>
            {block_data.routes[Object.keys(block_data.routes)[0]].short_name}</span>
        {/if}


        {#if block_data.routes[Object.keys(block_data.routes)[0]].long_name}
        <span  style='color:{block_data.routes[Object.keys(block_data.routes)[0]].color}' >
            {block_data.routes[Object.keys(block_data.routes)[0]].long_name}</span>
        {/if}

        
    </p>
    {/if}

    <p class="font-semibold">{$_("block")}: {block_id}</p>

    {$_("Duration")}: <TimeDiff show_brackets={false} diff={trip_duration_seconds} />

    {#if block_data}
        <div class='flex gap-y-1  py-1 flex-col align-center'>
            {#each block_data.trips as trip, index}
                <div class={`border-t border-gray-300 dark:border-slate-700 py-1 align-center ${current_time > trip.end_time ? 'text-gray-800 dark:text-gray-200': ""}`}>

                    {#if block_data.routes[trip.route_id] && !single_route}
                    <p class=' align-center'>

                        {#if block_data.routes[trip.route_id].short_name}
                        <span class='font-semibold' style='color:{block_data.routes[trip.route_id].color}'>
                            {block_data.routes[trip.route_id].short_name}</span>
                        {/if}


                        {#if block_data.routes[trip.route_id].long_name}
                        <span  style='color:{block_data.routes[trip.route_id].color}' >
                            {block_data.routes[trip.route_id].long_name}</span>
                        {/if}

                        
                    </p>{/if}

                    <div class='flex flex-row'>
                        <div>
                           

                        <p class='my-auto align-center'><svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 -960 960 960" class='h-4 w-4 inline-block' fill="currentColor"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>
                            {trip.trip_headsign}</p>
                        </div>

                        {#if ((current_time <= trip.end_time) && (current_time >= trip.start_time))}
                            <div class=' ml-2  h-2 w-2 relative rounded-full my-auto align-center flex'>
                                <div class="absolute  w-2 h-2  rounded-full bg-sky-500  animate-ping"></div>
                                <div class='relative  w-2 h-2  rounded-full bg-sky-500'></div>
                            </div>
                               {/if}

                        <div class="ml-auto ">
                           
                            <div
                        on:click={() => {
                            data_stack_store.update((x) => {
                                x.push(new StackInterface(
												new SingleTrip(
													chateau,
													trip.trip_id,
													trip.route_id,
													null,
													service_date.replaceAll("-", ""),
													null,
													null
												)
											));
                                return x;
                            });
                        }}
                        class=' px-1 rounded-full py-1 border border-blue-500 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800'

                        >

                       

                           <p class=''>
                            <svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 -960 960 960" class='h-5' fill="currentColor"><path d="M120-120v-320h80v184l504-504H520v-80h320v320h-80v-184L256-200h184v80H120Z"/></svg>
                           </p>
                            </div>
                        </div>
                    </div>

                 <p>
                    {$_("Duration")}:  <TimeDiff show_brackets={false} diff={trip.end_time - trip.start_time} />
                 </p>  



                    <div class="flex flex-row">
                        <p>{trip.first_stop_name}</p>
                        <p class='block ml-auto'>

                            <Clock timezone={trip.timezone_start}
                              time_seconds={trip.start_time}
                              />
                        </p>
                    </div>
                    <div class="flex flex-row">
                        <p>{trip.last_stop_name}</p>
                        <p class='block ml-auto'>
                            <Clock timezone={trip.timezone_end}
                            time_seconds={trip.end_time}
                            />
                        </p>
                    </div>
                </div>

                {#if block_data.trips[index + 1]}
                <p class='flex flex-row text-gray-800 dark:text-slate-200'>
                    <span class="material-symbols-outlined align-center text-xs">
                        self_improvement
                        </span>

                    <TimeDiff show_brackets={false}
                        diff={block_data.trips[index + 1].start_time - trip.end_time}
                        />
                </p>
                {/if}
            {/each}
        </div>
    {/if}
</div>

