import { get, writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { determineDarkModeToBool } from './determineDarkModeToBool';

export function makeFireMap(map: maplibregl.Map, chateaus_in_frame: Writable<string[]>) {
	console.log('load wildfire data');

	const darkMode = determineDarkModeToBool();

	const evacuation_fire_url = "https://services3.arcgis.com/uknczv4rpevve42E/arcgis/rest/services/CA_EVACUATIONS_PROD/FeatureServer/0/query/?spatialRel=esriSpatialRelIntersects&f=geojson&where=SHAPE__Area>0&outFields=*";

	const modis_url = "https://raw.githubusercontent.com/catenarytransit/fire-bounds-cache/refs/heads/main/data/modis.json";
	//const national_usa_fire_arcgis_url =	'https://raw.githubusercontent.com/catenarytransit/fire-bounds-cache/refs/heads/main/data/wfigs_fire_bounds.json';
	//  const california_firis_arcgis_url = "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CA_Perimeters_NIFC_FIRIS_public_view/FeatureServer/0/query?where=OBJECTID>0&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&units=esriSRUnit_Meter&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=4326&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnDistinctValues=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&quantizationParameters=&sqlFormat=none&f=pgeojson&token=";

	//fire section
	
//	map.addSource('arcgisfire', {
//		type: 'geojson',
//		data: national_usa_fire_arcgis_url
	//});
	

	map.addSource('evacuation_ca_fire', {
		type: 'geojson',
		data: evacuation_fire_url
	});
	/*
            map.addSource("californiafire", {
                type: "geojson",
                data: california_firis_arcgis_url 
            })*/

	map.addSource("modis", {
		type: 'geojson',
		data: modis_url
	})


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
		if (get(chateaus_in_frame).includes('amtrak')) {
			
		//	fetch_and_update_bounds_usa();
			
			fetch(evacuation_fire_url)
				.then(async (data) => await data.json())
				.then((cleaned_data: any) => {
					map.getSource('evacuation_fire').setData(cleaned_data);
				})
				.catch((err) => console.error(err));
		}
	}, 120_000);

	setInterval(() => {
		fetch(modis_url)
		.then(async (data) => await data.json())
		.then((cleaned_data: any) => {
			map.getSource('modis').setData(cleaned_data);
		})
		.catch((err) => console.error(err));
	}, 1000_000);

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
	  7,
	  12,
	  15,
	  22,
	  40
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
			'fill-opacity': 0.4
		},
		minzoom: 5
	});

			map.addSource('arcgisfirepoint', {
				type: 'geojson',
				data: "https://stg-arcgisazurecdataprod3.az.arcgis.com/exportfiles-2532-201269/IMSR_Incident_Locations_Most_Recent_View_-7922161599661102971.geojson?sv=2018-03-28&sr=b&sig=iNCmDjs038sig3DJ7jyIM6imAabZl3OH2AITGiWUOVw%3D&se=2024-06-17T04%3A49%3A30Z&sp=r"
				//data: "https://stg-arcgisazurecdataprod3.az.arcgis.com/exportfiles-2532-182272/WFIGS_Interagency_Perimeters_Current_-6544343811762491332.geojson?sv=2018-03-28&sr=b&sig=0Qpq7JG2NWRKLZnEynN%2BgcGPt41fWRNZvWGnaO8%2BZao%3D&se=2024-06-17T04%3A55%3A59Z&sp=r"
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
			'text-size': 13,
			'text-font': ['Barlow Bold']
		},
		minzoom: 5
	});
}
