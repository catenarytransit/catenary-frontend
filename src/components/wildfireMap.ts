import { get, writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { determineDarkModeToBool } from './determineDarkModeToBool';

async function make_fire_names(map: maplibregl.Map) {
	const image = await map.loadImage('/fire_1f525.png');

	map.addImage('fireicon', image.data);

	
	const darkMode = determineDarkModeToBool();

	map.addLayer({
		'id': 'firenameslabel',
		'type': 'symbol',
		'source': 'firenames',
		'layout': {
			'icon-image': 'fireicon',
			'icon-size': 0.04,
			'text-field': ['get', 'name'],
			'text-offset': [0, 1],
			'text-anchor': 'top',

			'text-size': 14,
			'text-font': ['Barlow Medium'],
			
		},
		paint: {
			'text-color': darkMode ? '#ffaaaa' : '#aa0000',
		},
		minzoom: 6,
	});
}

export function makeFireMap(map: maplibregl.Map, chateaus_in_frame: Writable<string[]>) {
	console.log('load wildfire data');

	const darkMode = determineDarkModeToBool();

	const evacuation_fire_url = "https://fireboundscache.catenarymaps.org/data/evac_california.json";

	const modis_url = "https://raw.githubusercontent.com/catenarytransit/fire-bounds-cache/refs/heads/main/data/modis.json";
	//const national_usa_fire_arcgis_url =	'https://raw.githubusercontent.com/catenarytransit/fire-bounds-cache/refs/heads/main/data/wfigs_fire_bounds.json';
	const california_firis_arcgis_url = "https://raw.githubusercontent.com/catenarytransit/fire-bounds-cache/refs/heads/main/data/ca_fire_bounds.json";

	const los_angeles_fire_evac = 'https://fireboundscache.catenarymaps.org/data/los_angeles_evac.json';

	const firenamesurl = 'https://fireboundscache.catenarymaps.org/data/firenames.json';

	//fire section
	
//	map.addSource('arcgisfire', {
//		type: 'geojson',
//		data: national_usa_fire_arcgis_url
	//});
	
	function fetch_and_update_layer(source_id:string, url:string) {
		fetch(url)
		.then(async (data) => await data.json())
		.then((cleaned_data: any) => {
			const source = map.getSource(source_id);

			if (source) {
				source.setData(cleaned_data);
			}
		})
		.catch((err) => console.error(err));
	}

	map.addSource('evacuation_ca_fire', {
		type: 'geojson',
		data: evacuation_fire_url
	});
	
	map.addSource('los_angeles_city_fire_evac', {
		type: 'geojson',
		data: los_angeles_fire_evac
	});
	

            map.addSource("californiafireperims", {
                type: "geojson",
                data: california_firis_arcgis_url 
            })

	map.addSource("modis", {
		type: 'geojson',
		data: modis_url
	})

	map.addSource('firenames', {
		type: 'geojson',
		data: firenamesurl
	})

	make_fire_names(map);

/*
	async function fetch_and_update_bounds_usa() {
		fetch(national_usa_fire_arcgis_url)
				.then(async (data) => await data.json())
				.then((cleaned_data: any) => {
					let arcgis_fire_source =map.getSource('arcgisfire');

					if (arcgis_fire_source) {
						arcgis_fire_source.setData(cleaned_data);
					}

				})
				.catch((err) => console.error(err));	
}*/



	setInterval(() => {

		fetch_and_update_layer('evacuation_ca_fire', evacuation_fire_url);

		fetch_and_update_layer('los_angeles_city_fire_evac', los_angeles_fire_evac);

		fetch_and_update_layer('firenames', firenamesurl);
		
	}, 30_000);

	setInterval(() => {
		fetch_and_update_layer('modis', modis_url)
	}, 60_000);

	/*
	map.addLayer({
		source: 'arcgisfire',
		id: 'arcgisfire',
		type: 'fill',
		filter: [
			'all',
			['!=', ['get', 'attr_FireBehaviorGeneral'], null],
			['!=', ['get', 'attr_FireBehaviorGeneral'], 'Minimal'],
			['!=', ['get', 'attr_IncidentName'], 'LINE']
		],
		paint: {
			'fill-color': '#dd3300',
			'fill-opacity': 0.2
		},
		minzoom: 5
	});

	map.addLayer({
		source: 'arcgisfire',
		id: 'arcgisfireborder',
		filter: [
			'all',
			['!=', ['get', 'attr_FireBehaviorGeneral'], null],
			['!=', ['get', 'attr_FireBehaviorGeneral'], 'Minimal'],
			['!=', ['get', 'attr_IncidentName'], 'LINE']
		],
		type: 'line',
		paint: {
			'line-color': '#ee0000',
			'line-width': 3
		},
		minzoom: 5
	});*/

	map.addLayer({
		"type": "circle",
		minzoom: 5,
		"id": 'modis',
		"paint": {
		  "circle-color": [
			"interpolate",
			["linear"],
			["get", "BRIGHTNESS"],
			310.64,
			"#ff751f",
			508.63,
			"#ff1a1a"
		  ],
		  "circle-opacity": [
			"interpolate",
			["linear"],
			["get", "BRIGHTNESS"],
			310.64,
			0.3,
			508.63,
			0.5
		  ],
		  "circle-radius": [
	  "interpolate",
	  ["linear"],
	  ["zoom"],
	  5,
	  1,
	  9,
	  5,
	  12,
	  15,
	  15,
	  40,
	  22,
	  50
	]
		},
		'source': 'modis'
	  });

	map.addLayer({
		source: 'evacuation_ca_fire',
		id: 'evacuation_ca_fire_bounds',
		type: 'fill',
		paint: {
			'fill-color': [
				'case',
				['==', ['get', 'STATUS'], 'Evacuation Order'],
				'#dd3300',
				['==', ['get', 'STATUS'], 'Evacuation Warning'],
				'#cc9900',
				'#ff0000'
			],
			'fill-opacity': [
				'interpolate',
				['linear'],
				['zoom'],
				9,
				0.3,
				12,
				0.2,
				15,
				0.2,
				16,
				0.15
			]
		},
		minzoom: 5
	});

	map.addLayer({
		source: 'los_angeles_city_fire_evac',
		id: 'los_angeles_city_fire_evac_bounds',
		type: 'fill',
		paint: {
			'fill-color': [
				'case',
				['==', ['get', 'Label'], 'Mandatory'],
				'#dd3300',
				['==', ['get', 'Label'], 'Warning'],
				'#cc9900',
				'#ff0000'
			],
			'fill-opacity': [
				'interpolate',
				['linear'],
				['zoom'],
				9,
				0.3,
				12,
				0.2,
				15,
				0.2
			]
		},
		minzoom: 5
	});

	map.addLayer({
		source: 'californiafireperims',
		id: 'californiafireperims',
		type: 'fill',
		paint: {
			'fill-color': '#ff0000',
			'fill-opacity': [
				'interpolate',
				['linear'],
				['zoom'],
				8,
				0.15,
				12,
				0.07,
				15,
				0.05
			]
		},
		minzoom: 5
	});


	map.addLayer({
		source: 'californiafireperims',
		id: 'californiafireperimslines',
		type: 'line',
		paint: {
			'line-color': '#ff0000',
			'line-opacity': 0.5,
			'line-width': 1.2,
			'line-dasharray': [2, 2]
		},
		minzoom: 6
	});

		
			
/*
	map.addLayer({
		source: 'arcgisfire',
		id: 'arcgisfirepoint',
		type: 'symbol',
		filter: [
			'all',
			['!=', ['get', 'attr_FireBehaviorGeneral'], null],
			['!=', ['get', 'attr_FireBehaviorGeneral'], 'Minimal'],
			['!=', ['get', 'attr_IncidentName'], 'LINE']
		],
		paint: {
			'text-color': darkMode ? '#ffaaaa' : '#aa0000'
		},
		layout: {
			'text-field': ['concat', ['get', 'attr_IncidentName'], ' FIRE'],
			'text-size': 10,
			'text-font': ['Barlow Medium']
		},
		minzoom: 5
	});
*/
	map.addLayer({
		source: 'evacuation_ca_fire',
		id: 'evacuation_ca_fire_txt',
		type: 'symbol',
		paint: {
			'text-color': darkMode ? '#ccaaaa' : '#cc0000'
		},
		layout: {
			'text-field': ['concat', ['get', 'STATUS'], ''],
			'text-size': [
				"interpolate",
				["linear"],
				['zoom'],
				7,
				8,
				9,
				13
			  ],
			'text-font': ['Barlow Bold']
		},
		minzoom: 6
	});

	map.addLayer({
		source: 'los_angeles_city_fire_evac',
		id: 'los_angeles_city_fire_evac_txt',
		type: 'symbol',
		paint: {
			'text-color': darkMode ? '#ccaaaa' : '#cc0000'
		},
		layout: {
			'text-field': [
				'case',
				['==', ['get', 'Label'], 'Mandatory'],
				"Mandatory Evacuation",
				['==', ['get', 'Label'], 'Warning'],
				'Evacuation Warning',
				' '
			],
			'text-size': [
				"interpolate",
				["linear"],
				['zoom'],
				7,
				8,
				9,
				12.5
			  ],
			'text-font': ['Barlow Bold']
		},
		minzoom: 6
	});
}
