import maplibregl from 'maplibre-gl';

export async function makeBearingArrowPointers(map: maplibregl.Map, darkMode: boolean, layerspercategory: any) {
	// const busbearingiconsize = ['interpolate', ['linear'], ['zoom'], 9, 0.18, 10.5, 0.25, 12, 0.47, 15, 1];

	const busbearingoffset = [
		'interpolate',
		['linear'],
		['zoom'],
		9,
		['literal', [0, -50]],
		10,
		['literal', [0, -45]],
		12,
		['literal', [0, -45]],
		13,
		['literal', [0, -50]],
		15,
		['literal', [0, -48]]
	];

	const busbearingsize = ['interpolate', ['linear'], ['zoom'], 8, 0.1, 9, 0.13, 12, 0.19, 15, 0.3];

	const railbearingiconsize = [
		'interpolate',
		['linear'],
		['zoom'],
		8,
		0.15,
		9,
		0.18,
		11,
		0.22,
		12,
		0.3,
		15,
		0.5
	];

	const railbearingoffset = [
		'interpolate',
		['linear'],
		['zoom'],
		9,
		['literal', [0, -80]],
		13,
		['literal', [0, -60]],
		15,
		['literal', [0, -60]]
	];

	const geobearingoffset = [
		'interpolate',
		['linear'],
		['zoom'],
		9,
		['literal', [0, -80]],
		13,
		['literal', [0, -60]],
		15,
		['literal', [0, -60]],
		17,
		['literal', [0, -50]]
	];

	
	const pointing_shell_light_image = await map.loadImage('/icons/pointing-shell-light.png');
	map.addImage('pointingshelllight', pointing_shell_light_image.data);

	const pointing_filled_image = await map.loadImage('/icons/pointing-filled.png');
	map.addImage('pointingcoloured', pointing_filled_image.data, { sdf: true });

	const pointing_shell_image = await map.loadImage('/icons/pointing-shell.png');
	map.addImage('pointingshell', pointing_shell_image.data);

	console.log('shells loaded');

	map.addLayer({
		id: layerspercategory.bus.pointing,
		source: 'buses',
		type: 'symbol',
		filter: ['all', ['==', true, ['get', 'has_bearing']], ['!=', ['get', 'bearing'], 0]],
		paint: {
			'icon-color': ['get', 'contrastdarkmodebearing'],
			'icon-opacity': 0.4
		},
		layout: {
			'icon-image': 'pointingcoloured',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'icon-rotate': ['get', 'bearing'],
			'icon-rotation-alignment': 'map',
			'icon-offset': busbearingoffset,
			'icon-size': busbearingsize
		},
		minzoom: 9.7
	});

	map.addLayer({
		id: layerspercategory.intercityrail.pointing,
		source: 'intercityrail',
		type: 'symbol',
		filter: ['all', ['==', true, ['get', 'has_bearing']], ['!=', ['get', 'bearing'], 0]],
		paint: {
			'icon-color': ['get', 'contrastdarkmodebearing'],
			'icon-opacity': 1
		},
		minZoom: 2,
		layout: {
			'icon-image': 'pointingcoloured',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'icon-rotate': ['get', 'bearing'],
			'icon-rotation-alignment': 'map',
			'icon-offset': railbearingoffset,
			'icon-size': railbearingiconsize
		}
	});

	map.addLayer({
		id: layerspercategory.localrail.pointing,
		source: 'localrail',
		type: 'symbol',
		filter: ['all', ['==', true, ['get', 'has_bearing']], ['!=', ['get', 'bearing'], 0]],
		paint: {
			'icon-color': ['get', 'contrastdarkmodebearing'],
			'icon-opacity': 0.6
		},
		layout: {
			'icon-image': 'pointingcoloured',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'icon-rotate': ['get', 'bearing'],
			'icon-rotation-alignment': 'map',
			'icon-offset': railbearingoffset,
			'icon-size': railbearingiconsize
		},
		minzoom: 4.5
	});

	map.addLayer({
		id: layerspercategory.other.pointing,
		source: 'other',
		type: 'symbol',
		filter: ['all', ['==', true, ['get', 'has_bearing']], ['!=', ['get', 'bearing'], 0]],
		paint: {
			'icon-color': ['get', 'contrastdarkmodebearing'],
			'icon-opacity': 0.6
		},
		layout: {
			'icon-image': 'pointingcoloured',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'icon-rotate': ['get', 'bearing'],
			'icon-rotation-alignment': 'map',
			'icon-offset': railbearingoffset,
			'icon-size': railbearingiconsize
		}
	});

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

	
	map.addLayer({
		id: layerspercategory.bus.pointingshell,
		source: 'buses',
		type: 'symbol',
		filter: ['all', ['==', true, ['get', 'has_bearing']], ['!=', ['get', 'bearing'], 0]],
		paint: {
			'icon-opacity': [
				'interpolate',
				['linear'],
				['zoom'],
				9,
				0.4,
				11,
				0.8
			]
		},
		layout: {
			'icon-image': darkMode == true ? 'pointingshell' : 'pointingshelllight',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'icon-rotate': ['get', 'bearing'],
			'icon-rotation-alignment': 'map',
			'icon-offset': busbearingoffset,
			'icon-size': busbearingsize
		},
		minzoom: 9.7
	});

	map.addLayer({
		id: layerspercategory.intercityrail.pointingshell,
		source: 'intercityrail',
		type: 'symbol',
		filter: ['all', ['==', true, ['get', 'has_bearing']], ['!=', ['get', 'bearing'], 0]],
		paint: {
			'icon-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.3, 11.5, 0.8]
		},
		minZoom: 2,
		layout: {
			'icon-image': darkMode == true ? 'pointingshell' : 'pointingshelllight',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'icon-rotate': ['get', 'bearing'],
			'icon-rotation-alignment': 'map',
			'icon-offset': railbearingoffset,
			'icon-size': railbearingiconsize
		}
	});

	map.addLayer({
		id: layerspercategory.localrail.pointingshell,
		source: 'localrail',
		type: 'symbol',
		filter: ['all', ['==', true, ['get', 'has_bearing']], ['!=', ['get', 'bearing'], 0]],
		paint: {
			'icon-opacity': ['interpolate', ['linear'], ['zoom'], 9.8, 0.3, 11, 0.4, 11.5, 0.8]
		},
		layout: {
			'icon-image': darkMode == true ? 'pointingshell' : 'pointingshelllight',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'icon-rotate': ['get', 'bearing'],
			'icon-rotation-alignment': 'map',
			'icon-offset': railbearingoffset,
			'icon-size': railbearingiconsize
		},
		minzoom: 4.5
	});

	map.addLayer({
		id: layerspercategory.other.pointingshell,
		source: 'other',
		type: 'symbol',
		filter: ['all', ['==', true, ['get', 'has_bearing']], ['!=', ['get', 'bearing'], 0]],
		paint: {
			'icon-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.3, 11.5, 0.8]
		},
		layout: {
			'icon-image': darkMode == true ? 'pointingshell' : 'pointingshelllight',
			'icon-allow-overlap': true,
			'icon-ignore-placement': true,
			'icon-rotate': ['get', 'bearing'],
			'icon-rotation-alignment': 'map',
			'icon-offset': railbearingoffset,
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
