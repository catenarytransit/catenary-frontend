<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { onMount } from 'svelte';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

	function flatten(arr:any) {
  return arr.reduce(function (flat:any, toFlatten:any) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

	let geolocation: GeolocationPosition;

	let lastknownheading: number;

	onMount(() => {
		const API_KEY = 'tf30gb2F4vIsBW5k9Msd';

		let rtFeedsTimestampsVehicles: any = new Object();
		let rtFeedsHashVehicles:any = new Object();

			
		let dark = "https://api.maptiler.com/maps/68c2a685-a6e4-4e26-b1c1-25b394003539";

		let light = "https://api.maptiler.com/maps/dbb80139-208d-449f-a69e-31243c0ee779";

		let style = ""

	//	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    
	if (false) {
		// dark mode
	style=dark;

} else {
	style=light;
}

		const map = new maplibregl.Map({
			container: 'map',
			style:
				style + '/style.json?key=' +
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
				 7,
				 2,
				 8,
				 3,
		                 10,
                 4,
                 16,
                 6,
              ],
					'circle-color': ['get', 'color'],
					'circle-stroke-color': '#fff',
					'circle-stroke-opacity': [
						"interpolate",
						["linear"],
						["zoom"],
						8,
						0.1,
						9,
						0.9
					],
					'circle-stroke-width': 0.8,
					'circle-opacity': 0.5
				}
			});

			map.addLayer({
				id: "labelbuses",
				type: "symbol",
				source: 'vehicles2',
				layout: {
					'text-field': ['get', 'routeId'],
					'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                'text-radial-offset': 0.2,
				'text-font': [
  "step",
  ["zoom"],
  [
    "literal",
    [
      "Open Sans Regular",
      "Arial Unicode MS Regular"
    ]
  ],
  10,
  [
    "literal",
    [
      "Open Sans Medium",
      "Arial Unicode MS Medium"
    ]
  ],
  14,
  [
    "literal",
    [
      "Open Sans Bold",
      "Arial Unicode MS Bold"
    ]
  ]
],
				'text-size': [
					"interpolate",
					["linear"],
					["zoom"],
					8,
					8,
					9,
					10,
					13,
					14
				],
				'text-ignore-placement': [
					'step',
					["zoom"],
					false,
					9.5,
					true
				]
				},
				paint: {
					'text-color': ['get', 'color'],
					'text-halo-color': "#eaeaea",
					//'text-halo-color': "#1d1d1d",
					'text-halo-width': 2,
					'text-halo-blur': 100,
					'text-opacity': [
					"interpolate",
					["linear"],
					["zoom"],
					6,
					0,
					7,
					0.8,
					10,
					1
				],
				},
			})

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
				},
				{
					color: "#801f3b",
					feed_id: "f-longbeachtransit~rt",
					agency_name: "Long Beach Transit"
				},
				{
					feed_id: 'f-foothilltransit~rt',
					color: '#2c6a4f',
					agency_name: 'Foothill Transit'
				}
			];

			let geometryObj:any = new Object();

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

					let url = `https://kactusapi.kylerchin.com/gtfsrt/?feed=${agency_obj.feed_id}&category=vehicles&skipfailure=true`;

					if (rtFeedsTimestampsVehicles[agency_obj.feed_id] != undefined) {
						url = url + "&timeofcache=" + rtFeedsTimestampsVehicles[agency_obj.feed_id];
					}

					if (rtFeedsHashVehicles[agency_obj.feed_id] != undefined) {
						url = url + "&bodyhash=" + rtFeedsHashVehicles[agency_obj.feed_id];
					}

					fetch(
						url
					)
						.then(async (response) => {

							

							if (response.status === 200) {

								console.log('hash for', agency_obj.feed_id, " is ",  response.headers.get('hash'))

							console.log(response.headers)
								
								rtFeedsHashVehicles[agency_obj.feed_id] = response.headers.get('hash');

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

							rtFeedsTimestampsVehicles[agency_obj.feed_id] = feed.header.timestamp;
								
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
										color: agency_obj.color,
										label: vehicle?.vehicle?.label,
										routeId: vehicle?.trip?.routeId.replace("-13168", "")
									},
									geometry: {
										type: 'Point',
										coordinates: [vehicle.position.longitude, vehicle.position.latitude]
									}
								};
							});

							//console.log('features', features);

							const getthesource = map.getSource('vehicles2');

							geometryObj[agency_obj.feed_id] = features;

							let flattenedarray = flatten(Object.values(geometryObj));

							console.log(flattenedarray);

							if (typeof getthesource != 'undefined') {
								getthesource.setData({
									type: 'FeatureCollection',
									features: flattenedarray
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

						if (false) {
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
		const id = navigator.geolocation.watchPosition(successCallback, errorCallback, {
			enableHighAccuracy: true
		});
}
		
	});

	
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
{#if typeof geolocation === "object"}
{#if typeof geolocation.coords.speed === "number"} 


<div class="inter fixed bottom-1 z-50 w-auto rounded-sm px-2 py-1 bg-white w-content ml-2  text-black text-sm z-10"><div>
	{geolocation.coords.speed.toFixed(2)} m/s {(3.6 * geolocation.coords.speed).toFixed(2)} km/h
</div></div>
{/if}

{/if}

<div id="map" style="width: 100%; height: 100%;" />


<style>
	.inter {
		font-family: 'Inter', sans-serif;
	}

	#map {
		width: 100%;
		height: 100%;
	}
</style>
