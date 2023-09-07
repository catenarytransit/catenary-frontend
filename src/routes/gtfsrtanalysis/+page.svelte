<script lang="ts">
	import { onMount } from "svelte";

    let info:any[] = [];

    let time = Date.now();

    //onload

    onMount(() => {
        setInterval(() => {
            
        }, 500)

        setInterval(() => {
            time = Date.now()
        },20)

    })
</script>

<div>
    <div>
        <h1>
            Kactus GTFS-rt audit and analysis
        </h1>
        <p class='slashed-zero tabular-nums'>{time}</p>
        <p>{new Date(time).toISOString()}</p>
    </div>
</div>