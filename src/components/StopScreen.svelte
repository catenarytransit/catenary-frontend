<script lang="ts">
	import { onMount } from 'svelte';
	import HomeButton from './SidebarParts/home_button.svelte';

    export let chateau: string;
    export let stop_id: string;

    let data_from_server = null;

    function fetch_stop_data() {
        console.log('Fetching data for chateau:', chateau, 'stop_id:', stop_id);
      

        fetch("https://birch.catenarymaps.org/departures_at_stop?stop_id=" + stop_id + "&chateau=" + chateau)
            .then(response => response.json())
            .then(data => {
                console.log('Fetched data:', data);

                data_from_server = data;
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            })
    }

    onMount(() => {
        fetch_stop_data();
    });

    $: if (chateau || stop_id) fetch_stop_data();
    
    </script>

<div>
    <HomeButton />


    
		<div>
            {#if data_from_server}

                

        {:else}
            <p>Loading...</p>
        {/if}
        </div>
</div>