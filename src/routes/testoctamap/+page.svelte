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

		
			function updateOctaData() {
        fetch("https://api.octa.net/GTFSRealTime/protoBuf/VehiclePositions.aspx", {
			mode: 'cors',
			headers: {
				'Access-Control-Allow-Origin':'*'
			}
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
										...vehicle,
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
}})
    
	}

	

	
	setInterval(() => {
			updateOctaData();
    }, 1000);
		

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