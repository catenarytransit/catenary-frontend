export function makeBearingArrowPointers(map:any, darkMode:boolean) {
    const busbearingiconsize = ['interpolate', ['linear'], ['zoom'], 9, 0.1, 12, 0.25, 15, 0.4]

			const busbearingoffset = ['interpolate', ['linear'], ['zoom'],9, ['literal', [0, -64]], 13, ['literal', [0, -45]], 15, ['literal', [0, -48]]]

			const railbearingiconsize = ['interpolate', ['linear'], ['zoom'], 9, 0.1, 12, 0.3, 15, 0.5]

			const railbearingoffset = ['interpolate', ['linear'], ['zoom'],9, ['literal', [0, -80]], 13, ['literal', [0, -60]], 15, ['literal', [0, -60]]]

			map.loadImage('./icons/pointing-shell-light.png', (error, image) => {
				if (image) {
					
					map.addImage('pointingshelllight', image);
				}});

			if (true) {
				map.loadImage('./icons/pointing-filled.png', (error, image) => {
				if (error) throw error;

				if (image) {
				map.addImage('pointingcoloured', image, {sdf: true});

				
				map.addLayer({
					id: "busespointing",
					source: 'buses',
					type: 'symbol',
					filter: ["!=", 0, ['get', 'bearing']],
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
						'icon-size': busbearingiconsize
					}

				});

				map.addLayer({
					id: "railpointing",
					source: 'rail',
					type: 'symbol',
					filter: ["!=", 0, ['get', 'bearing']],
					paint: {
						'icon-color': ['get', 'color'],
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

				
				}

			})

			}

			if (true) {
				map.loadImage('./icons/pointing-shell.png', (error, image) => {
				if (error) throw error;

				if (image) {
					
				map.addImage('pointingshell', image);

				map.addLayer({
					id: "busespointingshell",
					source: 'buses',
					type: 'symbol',
					filter: ["!=", 0, ['get', 'bearing']],
					paint: {
						'icon-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.3, 11.5, 0.8]
					},
					layout: {
						'icon-image': darkMode == true ? 'pointingshell' : 'pointingshelllight',
						'icon-allow-overlap': true,
						'icon-ignore-placement': true,
						'icon-rotate': ['get', 'bearing'],
						'icon-rotation-alignment': 'map',
						'icon-offset': busbearingoffset,
						'icon-size': busbearingiconsize
					}
				});

				map.addLayer({
					id: "railpointingshell",
					source: 'rail',
					type: 'symbol',
					filter: ["!=", 0, ['get', 'bearing']],
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
				}
			})
			}
}