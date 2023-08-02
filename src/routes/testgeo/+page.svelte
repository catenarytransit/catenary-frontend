<script>
    import { onMount } from "svelte";
    
    let lat = 0;
    let lng = 0;
    let speed = 0;
    let heading = 0;
    let accuracy = 0;
    
    onMount(() => {
        function success(pos) {
            console.log(pos);

  lat = pos.coords.latitude;
  lng = pos.coords.longitude;
  speed = pos.coords.speed;
  heading = pos.coords.heading;
  accuracy = pos.coords.accuracy;
}

function error(err) {
  console.error(`ERROR(${err.code}): ${err.message}`);
}

const options = {
  enableHighAccuracy: false,
  timeout: 5000,
  maximumAge: 0,
};

const id = navigator.geolocation.watchPosition(success, error, options);
    });
    </script>
    
    <h1>Realtime Location</h1>
    
    <p>Latitude: <b>{ lat }</b></p>
    <p>Longitude: <b>{ lng }</b></p>
    <p>Speed: <b>{ speed }</b></p>
    <p>Heading: <b>{ heading }</b></p>
    <p>Accuracy: <b>{accuracy}</b></p>