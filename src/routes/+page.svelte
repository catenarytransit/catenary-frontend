<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { onMount } from 'svelte';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

	let geolocation: GeolocationPosition;

	onMount(() => {
		const API_KEY = 'tf30gb2F4vIsBW5k9Msd';

		let rtFeedsTimestampsVehicles: any = new Object();

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
					'circle-radius': [
                 "interpolate",
                 ["linear"],
                 ["zoom"],
		                 10,
                 4,
                 16,
                 6,
              ],
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
					'circle-radius': [
                 "interpolate",
                 ["linear"],
                 ["zoom"],
                 10,
                 6,
                 16,
                 10,
              ],
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

			map.addSource('geolocation', {
'type': 'geojson',
'data': {
'type': 'FeatureCollection',
'features': [
{
'type': 'Feature',
'geometry': {
'type': 'Point',
'coordinates': [0,0]
}
}
]
}
});
			
			map.loadImage(
'https://transitmap.kylerchin.com/geo-circle.png',
(error, image) => {
if (error) throw error;
 
// Add the image to the map style.
map.addImage('geocircle', image);

			map.addLayer({

				id: "nobearing_position",	
				'type': 'symbol',
'source': 'geolocation', // reference the data source
'layout': {
'icon-image': 'geocircle', // reference the image
'icon-size': 0.1,
'visibility': 'none'
},
'paint': {
	
"icon-opacity": 0.8
}
			});

		});


		map.loadImage(
'https://transitmap.kylerchin.com/geo-nav.png',
(error, image) => {
if (error) throw error;
		// Add the image to the map style.
map.addImage('geonav', image);

map.addLayer({

	id: "bearing_position",	
	'type': 'symbol',
'source': 'geolocation', // reference the data source
'layout': {
'icon-image': 'geonav', // reference the image
'icon-size': 0.13,
'icon-rotate': ['get', 'bearing'],
'visibility': 'none'
},
'paint': {

"icon-opacity": 0.8
}
});

});
		


		/*
			map.addLayer({
				id: "hasbearing_position",
				type: "symbol",
				paint: {
					"": ""
				}			
			})*/

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
				},
				{
					feed_id: 'f-octa~rt',
					agency_name: 'Orange County',
					color: '#2868B7'
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
				agencies.forEach((agency_obj: any) => {

					let url = `https://kactusapi.kylerchin.com/gtfsrt/?feed=${agency_obj.feed_id}&category=vehicles`;

					if (rtFeedsTimestampsVehicles[agency_obj.feed_id] != undefined) {
						url = url + "&timeofcache=" + rtFeedsTimestampsVehicles[agency_obj.feed_id];
					}

					fetch(
						url
					)
						.then(async (response) => {

							if (response.status === 200) {
								

							return await response.arrayBuffer();
							} else {
								return null;
							}
						})
						.then((buffer) => {

							if (buffer != null) {
								const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
								new Uint8Array(buffer)
							);

							rtFeedsTimestampsVehicles[`${agency_obj.feed_id}`] = feed.header.timestamp;

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

							if (typeof getthesource != 'undefined') {
								getthesource.setData({
									type: 'FeatureCollection',
									features
								});
							}
						}})
						.catch((e) => {
							console.error(e);
						});
							}

				)
		
			}, 2000);
		});

		const successCallback = (position: any) => {
			//console.log(position);

			let location = position;


					if (location) {
						geolocation = location;

						console.log(geolocation);

						let geolocationdata = map.getSource('geolocation');

						if (geolocationdata) {
							geolocationdata.setData({
							'type': 'FeatureCollection',
							'features': [
							{
							'type': 'Feature',
							'geometry': {
							'type': 'Point',
							'coordinates': [location.coords.longitude, location.coords.latitude]
							},
							'properties': {
								'accuracy': location.coords.accuracy,
								'heading': location.coords.heading
							}
							}
							]
							})
						}

						if (typeof location.coords.heading === "number") {
							console.log('bearing is', location.coords.heading)
							map.setLayoutProperty("nobearing_position", 'visibility', 'none');
							
							map.setLayoutProperty("bearing_position", 'visibility', 'visible');							
						} else {
							map.setLayoutProperty("nobearing_position", 'visibility', 'visible');
							
							map.setLayoutProperty("bearing_position", 'visibility', 'none');
						}
					}
		};

		const errorCallback = (error: any) => {
			console.log(error);
		};

		if (typeof window !== 'undefined') {
	// client-only code here
	navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
			enableHighAccuracy: true
		});

		const id = navigator.geolocation.watchPosition(successCallback, errorCallback, {
			enableHighAccuracy: true
		});
}
		
	});

	
</script>

<div id="map" style="width: 100%; height: 100%;" />
	{#if typeof geolocation === "object"}
	{#if typeof geolocation.coords.speed === "number"} 

	
<div class="absolute top-1 left-0 px-1 py-1 bg-white text-black text-sm">{geolocation.coords.speed} m/s {geolocation.coords.speed} km/h</div>
	{/if}

	{/if}
	

<style>
	#map {
		width: 100%;
		height: 100%;
	}
</style>
