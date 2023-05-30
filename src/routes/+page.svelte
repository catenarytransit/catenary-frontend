<script>
	import maplibregl from 'maplibre-gl';
	import { onMount } from 'svelte';

	onMount(() => {
		const map = new maplibregl.Map({
			container: 'map',
			style:
				'https://api.maptiler.com/maps/dbb80139-208d-449f-a69e-31243c0ee779/style.json?key=tf30gb2F4vIsBW5k9Msd', // stylesheet location
			center: [-118, 33.9], // starting position [lng, lat]
			zoom: 8 // starting zoom
		});
	});
</script>

<div id="map" style="width: 100%; height: 100%;" />

<style>
	#map {
		width: 100%;
		height: 100%;
	}
</style>
