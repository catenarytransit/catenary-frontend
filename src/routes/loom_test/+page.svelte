<script lang="ts">
    	import mapboxgl from 'mapbox-gl';
        import { onMount } from 'svelte';
        
	    import { decode as decodeToAry, encode as encodeAry } from 'base65536';

        const decode = (textToDecode: string) => {
		try {
			return new TextDecoder().decode(decodeToAry(textToDecode));
		} catch (e) {
			return 'Decode failed: Invalid input';
		}
	};
    
		let centerinit:[number, number] = [-118, 33.9];
        let zoominit = 8.1;

        onMount(() => {
            const map = new mapboxgl.Map({
			container: 'map',
			crossSourceCollisions: true,
			hash: 'pos',
			preserveDrawingBuffer: false,
			attributionControl: false,
			//	antialias: true,
			style: "mapbox://styles/kylerschin/clu3orpuz026g01ra7kcgg9s9", // stylesheet location
			accessToken: decode(
				'ꉰ騮罹縱𒁪险ꌳ轳罘蹺鴲靰繩繳穭葩罩陪筪陳繪輰艈艷繄艺筮陷荘靨ꍄ荲鵄繫敮謮轤𔕰𖥊浊豧扁缭𠁎詫鐵ᕑ'
			),
			center: centerinit, // starting position [lng, lat]
			//keep the centre at Los Angeles, since that is our primary user base currently
			//switch to IP geolocation and on the fly rendering for this soon
			zoom: zoominit, // starting zoom (must be greater than 8.1)
			fadeDuration: 0
		});

        map.on("load", () => {
            map.addSource("geo-subway-lightrail", {
                type: "vector",
                url: "https://kylerchin.com/loom_proxy_freiburg/tram/"
            });

            map.addLayer({
                id: "subway-lightrail-layer-lines",
                source: "geo-subway-lightrail",
				'source-layer': "lines",
                paint: {
                    'line-color': ['concat', '#', ['get', 'color']],
                    'line-width': ["get", "width"]
                },
                "type": "line"
            });
        });
        });
</script>

<title>Catenary Maps - LOOM TEST</title>

<div id="map" class="fixed top-0 left-0 w-[100vw] h-[100vh]" />