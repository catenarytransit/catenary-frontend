import maplibregl from 'maplibre-gl';

export async function makeBearingArrowPointers(map: maplibregl.Map, darkMode: boolean, layerspercategory: any) {
	// const busbearingiconsize = ['interpolate', ['linear'], ['zoom'], 9, 0.18, 10.5, 0.25, 12, 0.47, 15, 1];


	//USER LOCATION

	map.addLayer({
		id: 'geolocationheadingfill',
		source: 'geolocation',
		type: 'symbol',
		paint: {
			'icon-color': '#2563EB',
			'icon-opacity': 0.8
		},
		filter: ['==', true, ['get', 'has_bearing']],
		layout: {
			'icon-image': 'pointingcoloured',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'icon-rotate': ['get', 'heading'],
			'icon-rotation-alignment': 'map',
			'icon-offset': geobearingoffset,
			'icon-size': railbearingiconsize
		}
	});




	//usergeo

	map.addLayer({
		id: 'geolocationheadingshell',
		source: 'geolocation',
		type: 'symbol',
		filter: ['==', true, ['get', 'has_bearing']],
		paint: {
			'icon-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.3, 11.5, 0.8]
		},
		layout: {
			'icon-image': darkMode == true ? 'pointingshell' : 'pointingshelllight',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'icon-rotate': ['get', 'heading'],
			'icon-rotation-alignment': 'map',
			'icon-offset': geobearingoffset,
			'icon-size': railbearingiconsize
		}
	});
}
