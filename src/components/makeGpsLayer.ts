export function makeGpsLayer(map: mapboxgl.Map) {
	try {
		map.addSource('geolocation', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [0, 0]
						},
						properties: {}
					}
				]
			}
		});

		map.loadImage('/geo-circle.png', (error, image) => {
			if (error) throw error;

			// Add the image to the map style.
			map.addImage('geocircle', image);

			map.addLayer({
				id: 'nobearing_position',
				type: 'symbol',
				source: 'geolocation', // reference the data source
				layout: {
					'icon-image': 'geocircle', // reference the image
					'icon-size': 0.1,
					visibility: 'none',
					'icon-allow-overlap': true,
					'icon-ignore-placement': true,
					'text-allow-overlap': true,
					'text-ignore-placement': true
				},
				paint: {
					'icon-opacity': 0.8,
					'icon-emissive-strength': 1
				}
			});
		});

		map.loadImage('/geo-nav.png', (error, image) => {
			if (error) throw error;
			// Add the image to the map style.
			map.addImage('geonav', image);

			map.addLayer({
				id: 'bearing_position',
				type: 'symbol',
				source: 'geolocation', // reference the data source
				layout: {
					'icon-image': 'geonav', // reference the image
					'icon-size': 0.13,
					'icon-rotate': ['get', 'heading'],
					visibility: 'none',
					'icon-rotation-alignment': 'map'
				},
				paint: {
					'icon-opacity': 0.8,
					'icon-emissive-strength': 1
				}
			});
		});
	} catch (e) {
		console.error(e);
	}
}
