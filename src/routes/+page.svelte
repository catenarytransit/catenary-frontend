<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { onMount } from 'svelte';

	onMount(() => {
		const API_KEY = 'tf30gb2F4vIsBW5k9Msd';

		const map = new maplibregl.Map({
			container: 'map',
			style:
				'https://api.maptiler.com/maps/dbb80139-208d-449f-a69e-31243c0ee779/style.json?key=' +
				API_KEY, // stylesheet location
			center: [-118, 33.9], // starting position [lng, lat]
			zoom: 8 // starting zoom
		});

		map.on('load', () => {
			// Add new sources and layers
			map.addSource('terrain', {
				type: 'raster-dem',
				url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${API_KEY}`
			});

			map.setTerrain({
				source: 'terrain'
			});

			map.addSource('vehicles', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addLayer({
				id: 'vehicles',
				type: 'circle',
				source: 'vehicles',
				paint: {
					'circle-radius': 6,
					'circle-color': ['get', 'color']
				}
			});

			const convertRouteIdToColor = (id: string) => {
				if (id === '801') return '#0072BC';
				if (id === '802') return '#EB131B';
				if (id === '803') return '#58A738';
				if (id === '804') return '#FDB913';
				if (id === '805') return '#A05DA5';
				if (id === '807') return '#E56DB1';
				return '#000000';
			};

			setInterval(() => {
				fetch(
					'https://kactusapi.kylerchin.com/gtfsrtasjson/?feed=f-metro~losangeles~rail~rt&category=vehicles'
				)
					.then((response) => response.json())
					.then((data) => {
						//map.getSource('vehicles').setData(data);
						//console.log(data);

						//console.log(data.entity);

						const features = data.entity.map((entity: any) => {
							const { id, vehicle } = entity;

							//console.log('entity', entity);

							//console.log('has trip', vehicle.trip);

							return {
								type: 'Feature',
								id,
								properties: {
									...vehicle,
									color: convertRouteIdToColor(
										vehicle.trip ? vehicle.trip.routeId || 'none' : 'none'
									)
								},
								geometry: {
									type: 'Point',
									coordinates: [vehicle.position.longitude, vehicle.position.latitude]
								}
							};
						});

						console.log(features);

						const getthesource = map.getSource('vehicles');

						if (getthesource != 'undefined' && typeof getthesource != 'undefined') {
							getthesource.setData({
								type: 'FeatureCollection',
								features
							});
						}
					});
			}, 1000);
		});

		const successCallback = (position: any) => {
			console.log(position);
		};

		const errorCallback = (error: any) => {
			console.log(error);
		};

		navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
	});
</script>

<div id="map" style="width: 100%; height: 100%;" />

<style>
	#map {
		width: 100%;
		height: 100%;
	}
</style>
