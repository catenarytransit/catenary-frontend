<script lang="ts">
	import { map_pointer_store } from './../globalstores';
	import { onMount } from "svelte";
    import {get} from "svelte/store";
    import jsonwebworkerpkg from '@cheprasov/json-web-worker';
	const { jsonWebWorker, parse, stringify } = jsonwebworkerpkg;

    export let osm_id: string;
    export let osm_class: string;

    let nominatim_data_saved = null;

    $: if (osm_id) fetchOsmInfo();

    function fetchOsmInfo() {

        let global_map_pointer = get(map_pointer_store);

        fetch("https://birch.catenarymaps.org/nominatim_details?osm_id=" + osm_id,
            {
                "mode": "cors"
            }
        )
        .then((response) => response.text())
		.then((text) => jsonWebWorker.parse(text))
        .then((nominatim_data) => {

            nominatim_data_saved = nominatim_data;

            console.log("Osm details", nominatim_data)

                   global_map_pointer.getSource('redpin').setData({
						type: 'FeatureCollection',
						features: [
							{
								type: 'Feature',
								properties: {},
								geometry: {
									coordinates: nominatim_data.centroid.coordinates,
									type: 'Point'
								}
							}
						]
					});
        })

     
    }

    onMount(() => {
        fetchOsmInfo();
    })
</script>

<div class="mx-1">
    {#if nominatim_data_saved}

        {#if nominatim_data_saved.localname}
        <h1 class='font-medium'>{nominatim_data_saved.localname}</h1>
            

        {/if}

        {#if nominatim_data_saved.names}
        
            <p>
                {#each Object.entries(nominatim_data_saved.names).filter((x) => x[1] != nominatim_data_saved.localname) as name_entry}
                <span class='text-xs'>{name_entry[1]} ,</span>
            {/each}
            </p>
        
        {/if}

        {#if nominatim_data_saved.extratags}
            {#if nominatim_data_saved.extratags.wikipedia}
            
                <a class="underline text-seashore dark:text-seashoredark" href={"https://" + nominatim_data_saved.extratags.wikipedia.split(":")[0] + ".wikipedia.org/wiki/" + nominatim_data_saved.extratags.wikipedia.split(":")[1]}>Wikipedia</a>

            {/if}
        {/if}
    
    {/if}
</div>