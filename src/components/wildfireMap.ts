import { get, writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { dark_mode_store } from '../globalstores';

export function makeFireMap(map: maplibregl.Map, chateaus_in_frame: Writable<string[]>) {
	console.log('load wildfire data');

	const darkMode = get(dark_mode_store);

	const national_usa_fire_arcgis_url =
		'https://services3.arcgis.com/T4QMspbfLg3qTGWY/ArcGIS/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query?where=Shape__Area>0&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&units=esriSRUnit_Meter&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=4326&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnDistinctValues=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&quantizationParameters=&sqlFormat=none&f=pgeojson&token=';
	//  const california_firis_arcgis_url = "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CA_Perimeters_NIFC_FIRIS_public_view/FeatureServer/0/query?where=OBJECTID>0&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&units=esriSRUnit_Meter&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=4326&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnDistinctValues=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&quantizationParameters=&sqlFormat=none&f=pgeojson&token=";

	//fire section
	map.addSource('arcgisfire', {
		type: 'geojson',
		//data: "https://stg-arcgisazurecdataprod3.az.arcgis.com/exportfiles-2532-201269/IMSR_Incident_Locations_Most_Recent_View_-7922161599661102971.geojson?sv=2018-03-28&sr=b&sig=iNCmDjs038sig3DJ7jyIM6imAabZl3OH2AITGiWUOVw%3D&se=2024-06-17T04%3A49%3A30Z&sp=r"
		data: national_usa_fire_arcgis_url
	});
	/*
            map.addSource("californiafire", {
                type: "geojson",
                data: california_firis_arcgis_url 
            })*/

	setInterval(() => {
		if (get(chateaus_in_frame).includes('amtrak')) {
			fetch(national_usa_fire_arcgis_url)
				.then(async (data) => await data.json())
				.then((cleaned_data: any) => {
					map.getSource('arcgisfire').setData(cleaned_data);
				})
				.catch((err) => console.error(err));
			/*
                    fetch(
						california_firis_arcgis_url 
					)
					.then(async (data) => await data.json())
					.then((cleaned_data:any) => {
						map.getSource(
						'californiafire'
						).setData(cleaned_data)
					})
					.catch((err) => console.error(err))*/
		}
	}, 120_000);

	map.addLayer({
		source: 'arcgisfire',
		id: 'arcgisfire',
		type: 'fill',
		filter: [
			'all',
			['!=', ['get', 'attr_FireBehaviorGeneral'], null],
			['!=', ['get', 'attr_FireBehaviorGeneral'], 'Minimal']
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
			['!=', ['get', 'attr_FireBehaviorGeneral'], 'Minimal']
		],
		type: 'line',
		paint: {
			'line-color': '#ee0000',
			'line-width': 3
		},
		minzoom: 5
	});
	/*
            map.addLayer({
				source: "californiafire",
				id: 'caarcgisfire',
				type: "fill",
                filter: [
                    'all',
                    ['>',['get', 'poly_DateCurrent'], Date.now()  - (86400_000 * 0.8)],
                    ["==", ['get', 'type'], "Heat Perimeter"]
                ],
				paint: {
					"fill-color": "#dd4400",
					"fill-opacity": 0.2,
				},
				minzoom: 6
			});

			map.addLayer({
				source: "californiafire",
				id: 'caarcgisfireborder',
				type: "line",
                filter: [
                    'all',
                    ['>',['get', 'poly_DateCurrent'], Date.now()  - (86400_000 * 0.8)],
                    ["==", ['get', 'type'], "Heat Perimeter"]
                ],
				paint: {
					"line-color": "#eeaa00",
					"line-width": 1.5
				},
				minzoom: 6
			});*/

	/*		map.addSource('arcgisfirepoint', {
				type: 'geojson',
				data: "https://stg-arcgisazurecdataprod3.az.arcgis.com/exportfiles-2532-201269/IMSR_Incident_Locations_Most_Recent_View_-7922161599661102971.geojson?sv=2018-03-28&sr=b&sig=iNCmDjs038sig3DJ7jyIM6imAabZl3OH2AITGiWUOVw%3D&se=2024-06-17T04%3A49%3A30Z&sp=r"
				//data: "https://stg-arcgisazurecdataprod3.az.arcgis.com/exportfiles-2532-182272/WFIGS_Interagency_Perimeters_Current_-6544343811762491332.geojson?sv=2018-03-28&sr=b&sig=0Qpq7JG2NWRKLZnEynN%2BgcGPt41fWRNZvWGnaO8%2BZao%3D&se=2024-06-17T04%3A55%3A59Z&sp=r"
			});
			
        */
	/*

            map.addLayer({
				source: "californiafire",
				id: 'caarcgisfirelabel',
				type: "symbol",
                filter: [
                    'all',
                    ['>',['get', 'poly_DateCurrent'], Date.now() - (86400_000 * 0.8)],
                    ["==", ['get', 'type'], "Heat Perimeter"],
                ],
				paint: {
					"text-color":  darkMode? "#ffaaaa" : "#aa0000",
				},
				layout: {
					"text-field": ['concat', ['get', 'mission'], " FIRE"],
					'text-size': 8,
					'text-font': ['Barlow Medium', 'Arial Unicode MS Bold'],
				},
				minzoom: 6
			});*/

	map.addLayer({
		source: 'arcgisfire',
		id: 'arcgisfirepoint',
		type: 'symbol',
		filter: [
			'all',
			['!=', ['get', 'attr_FireBehaviorGeneral'], null],
			['!=', ['get', 'attr_FireBehaviorGeneral'], 'Minimal']
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
}
