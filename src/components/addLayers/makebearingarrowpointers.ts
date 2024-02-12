export function makeBearingArrowPointers(map:any, darkMode:boolean,layerspercategory:any) {
    const busbearingiconsize = 0.3;

	const busbearingoffset = ['literal', [0, -43]];

	const railbearingiconsize = 0.5;

	const railbearingoffset = ['literal', [0, -40]];

	const geobearingoffset = ['interpolate', ['linear'], ['zoom'],9, ['literal', [0, -80]], 13, ['literal', [0, -60]], 15, ['literal', [0, -60]], 17, ['literal', [0, -50]]];

	map.loadImage('./icons/pointing-shell-light.png', (error, image) => {
		if (image) {
			
			map.addImage('pointingshelllight', image);
		}});

		map.loadImage('./icons/pointing-filled.png', (error, image) => {
		if (error) throw error;

		if (image) {
		map.addImage('pointingcoloured', image, {sdf: true});

		
		map.addLayer({
			id:  layerspercategory.bus.pointing,
			source: 'buses',
			type: 'symbol',
			filter: ["!=", 0, ['get', 'bearing']],
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
				'icon-offset': busbearingoffset,
				'icon-size': busbearingiconsize
			},
			minzoom: 12
		});

		map.addLayer({
			id: layerspercategory.intercityrail.pointing,
			source: 'intercityrail',
			type: 'symbol',
			filter: ["!=", 0, ['get', 'bearing']],
			paint: {
				'icon-color': ['get', 'contrastdarkmodebearing'],
				'icon-opacity': 0.6
			},
			minZoom: 6,
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
			filter: ["!=", 0, ['get', 'bearing']],
			paint: {
				'icon-color': ['get', 'contrastdarkmodebearing'],
				'icon-opacity': 0.6
			},
			minZoom: 10,
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
			id: layerspercategory.other.pointing,
			source: 'other',
			type: 'symbol',
			filter: ["!=", 0, ['get', 'bearing']],
			paint: {
				'icon-color': ['get', 'contrastdarkmodebearing'],
				'icon-opacity': 0.6
			},
			minZoom: 10,
			layout: {
				'icon-image': 'pointingcoloured',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
				'icon-rotate': ['get', 'bearing'],
				'icon-rotation-alignment': 'map',
				'icon-offset': busbearingoffset,
				'icon-size': busbearingiconsize
			}
		});

		//USER LOCATION

		map.addLayer({
			id: 'geolocationheadingfill',
			source: 'geolocation',
			type: 'symbol',
			filter: ["!=", null, ['get', 'heading']],
			paint: {
				'icon-color': "#2563EB",
				'icon-opacity': 0.8
			},
			layout: {
				'icon-image': 'pointingcoloured',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
				'icon-rotate': ['get', 'heading'],
				'icon-rotation-alignment': 'map',
				'icon-offset':  geobearingoffset,
				'icon-size': railbearingiconsize
			}
		});

		
		}

	})
	
}