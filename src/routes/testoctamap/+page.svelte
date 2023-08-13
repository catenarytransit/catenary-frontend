<script lang="ts">
    import octaroutes from '../../octa_routes.json'
	import { onMount, onDestroy } from "svelte";
	import { Map } from "mapbox-gl";
	import "mapbox-gl/dist/mapbox-gl.css"
    import GtfsRealtimeBindings from 'gtfs-realtime-bindings';


	let map;
	let mapContainer;
	let lng, lat, zoom;

    let triggeredOcta = false;

	lng = -117.8311;
	lat = 33.7175;
	zoom = 9.7;

	function updateData() {
        zoom = map.getZoom();
    	lng = map.getCenter().lng;
    	lat = map.getCenter().lat;
    }
    	


  function findColor(routeId:String) {
    let octaroutespost:any = octaroutes.map((x:any) => {
        return {
            ...x,
            route_short_name: new String(x.route_short_name).trim()
        }
    })

    let routefound = octaroutespost.find((x:any) => x.route_short_name == routeId);

    if (routefound) {
        return "#" + routefound.route_color;
    } else {
        return '#be123c';
    }
  }

	onMount(() => {
		const initialState = { lng: lng, lat: lat, zoom: zoom };

		map = new Map({
			container: mapContainer,
			accessToken: "pk.eyJ1Ijoia3lsZXJzY2hpbiIsImEiOiJjajFsajI0ZHMwMDIzMnFwaXNhbDlrNDhkIn0.VdZpwJyJ8gWA--JNzkU5_Q",
			style: `mapbox://styles/kylerschin/cll95ls8j00bn01oj1dr98sgx`,
			center: [initialState.lng, initialState.lat],
			zoom: initialState.zoom,
		});

		map.on('move', () => {
			updateData();
		})

		
		
	map.on('load', () => {
		console.log('loaded');

		map.addSource('vehicles', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addLayer({
				id: 'vehicles2',
				type: 'circle',
				source: 'vehicles',
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
					'circle-opacity': 0.9
				}
			});

			map.addLayer({
				id: "labelbuses",
				type: "symbol",
				source: 'vehicles',
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
					'text-halo-color': "#1a1a1a",
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

		function updateOctaData() {
        fetch("https://kactusapi.kylerchin.com/gtfsrt/?feed=f-octa~rt&category=vehicles&suicidebutton=true", {
			
		})
        .then((response) => response.arrayBuffer())
        .then((buffer) => {

if (buffer != null) {
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer)
);

    console.log(feed);

    const features = feed.entity.map((entity: any) => {
								const { id, vehicle } = entity;

								//console.log('entity', entity);

								//console.log('has trip', vehicle.trip);

								return {
									type: 'Feature',
									id,
									properties: {
										
										color: findColor(vehicle?.trip?.routeId),
										label: vehicle?.vehicle?.label,
										routeId: vehicle?.trip?.routeId
									},
									geometry: {
										type: 'Point',
										coordinates: [vehicle.position.longitude, vehicle.position.latitude]
									}
								};
							});

                            console.log('features', features);

							map.getSource("vehicles").setData({
									type: "FeatureCollection",
									features
								}
		);
							
}})
    
	}

	

	
	setInterval(() => {
			updateOctaData();
    }, 1000);
	})
		

		onDestroy(() => {
		map.remove();
	});
});


   

	
</script>

<div>
	<div class="sidebar">
		Longitude: {lng.toFixed(4)} | Latitude: {lat.toFixed(4)} | Zoom: {zoom.toFixed(
			2
		)}
	</div>
	<div class="map-wrap">
		<div class="map" bind:this={mapContainer} />
	</div>
</div>

<style>
	.map {
		position: absolute;
		width: 100%;
		height: 100%;
	}
	.sidebar {
		background-color: rgba(35, 55, 75, 0.9);
		color: #fff;
		padding: 6px 12px;
		font-family: monospace;
		z-index: 1;
		position: absolute;
		top: 0;
		left: 0;
		margin: 12px;
		border-radius: 4px;
	}
</style>