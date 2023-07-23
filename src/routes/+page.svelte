<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { onMount } from 'svelte';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

	let geolocation: GeolocationPosition;

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

			map.addSource('vehicles2', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addLayer({
				id: 'vehicles2',
				type: 'circle',
				source: 'vehicles2',
				paint: {
					'circle-radius': 4,
					'circle-color': ['get', 'color'],
					'circle-stroke-color': '#fff',
					'circle-stroke-width': 0.8,
					'circle-opacity': 0.5
				}
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
					'circle-color': ['get', 'color'],
					'circle-stroke-color': '#fff',
					'circle-stroke-width': 1,
					'circle-opacity': 0.8
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

			let agencies = [
				/*
				{
					feed_id: 'f-octa~rt',
					agency_name: 'Orange County Transportation Authority',
					color: '#00AFF2'
				},
				*/
				{
					feed_id: 'f-metro~losangeles~bus~rt',
					agency_name: 'Los Angeles Metro',
					color: '#E16710'
				}
			];

			setInterval(() => {
				fetch(
					'https://kactusapi.kylerchin.com/gtfsrtasjson/?feed=f-metro~losangeles~rail~rt&category=vehicles'
				)
					.then((response) => response.json())
					.then((data) => {
						//map.getSource('vehicles').setData(data);
						//console.log(data);

						//console.log(data.entity);

						const features = data.entity
							.map((entity: any) => {
								if (entity.vehicle) {
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
								} else {
									return undefined;
								}
							})
							.filter((x) => x != undefined);

						//console.log(features);

						const getthesource = map.getSource('vehicles');

						if (getthesource != 'undefined' && typeof getthesource != 'undefined') {
							getthesource.setData({
								type: 'FeatureCollection',
								features
							});
						}
					});
			}, 1000);

			

			setInterval(() => {
				navigator.geolocation.getCurrentPosition((location) => {
					if (location) {
						geolocation = location;

						console.log(geolocation);
					}
				});
			})

			setInterval(() => {
				agencies.forEach((agency_obj: any) => {
					fetch(
						`https://kactusapi.kylerchin.com/gtfsrt/?feed=${agency_obj.feed_id}&category=vehicles`
					)
						.then(async (response) => {
							return await response.arrayBuffer();
						})
						.then((buffer) => {
							const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
								new Uint8Array(buffer)
							);

							//console.log('feed', feed);

							const features = feed.entity.map((entity: any) => {
								const { id, vehicle } = entity;

								//console.log('entity', entity);

								//console.log('has trip', vehicle.trip);

								return {
									type: 'Feature',
									id,
									properties: {
										...vehicle,
										color: '#E16710'
									},
									geometry: {
										type: 'Point',
										coordinates: [vehicle.position.longitude, vehicle.position.latitude]
									}
								};
							});

							//console.log('features', features);

							const getthesource = map.getSource('vehicles2');

							if (getthesource != 'undefined' && typeof getthesource != 'undefined') {
								getthesource.setData({
									type: 'FeatureCollection',
									features
								});
							}
						})
						.catch((e) => {
							console.error(e);
						});
				});
			}, 2000);
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

	{#if typeof geolocation === "object"} 
	{#if typeof geolocation.coords.speed === "number"} 

	<div class="absolute bottom-0 left-0 px-1 py-1 bg-white text-black text-sm">{geolocation.coords.speed} m/s {geolocation.coords.speed} km/h</div>
	{/if}
	{/if}

<style>
	#map {
		width: 100%;
		height: 100%;
	}
</style>
