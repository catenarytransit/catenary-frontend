<script>
    import { onMount } from "svelte";
    import getLocation from "geolocation";
    
    let lat = 0;
    let lng = 0;
    let speed = 0;
    let bearing = 0;
    
    onMount(() => {
      getLocation().then(({ coords }) => {
        lat = coords.latitude;
        lng = coords.longitude;
        speed = coords.speed;
        bearing = coords.bearing;
      });
    });
    </script>
    
    <h1>Realtime Location</h1>
    
    <p>Latitude: <b>{{ lat }}</b></p>
    <p>Longitude: <b>{{ lng }}</b></p>
    <p>Speed: <b>{{ speed }}</b></p>
    <p>Bearing: <b>{{ bearing }}</b></p>