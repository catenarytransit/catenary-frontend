
function textColorOfMapLabels(darkMode:boolean) {
    return ['get', darkMode === true ? 'contrastdarkmode' : 'color'];
}

export function makeCircleLayers(map:any, darkMode: boolean, layerspercategory: any) {
    map.addLayer({
        id: layerspercategory.bus.livedots,
        type: 'circle',
        source: 'buses',
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 2, 8, 3, 10, 4, 16, 6],
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#fff',
            'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 7.9, 0, 9, 0.9],
            'circle-stroke-width': 0.8,
            'circle-emissive-strength': 1,
            'circle-opacity': 0.3
        },
        minzoom: 7
    });

    map.addLayer({
        id: layerspercategory.bus.labeldots,
        type: 'symbol',
        source: 'buses',
        layout: {
            'text-field': ['get', 'maptag'],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.2,
            'text-emissive-strength': 1,
            'text-font': [
                'step',
                ['zoom'],
                ['literal', ['DIN Pro Regular', 'Arial Unicode MS Regular']],
                9,
                ['literal', ['DIN Pro Bold', 'Arial Unicode MS Medium']],
            ],

            'text-size': 15,

            // 'text-ignore-placement': ['step', ['zoom'], false, 9.5, true]
        },
        paint: {
            'text-color': textColorOfMapLabels(darkMode),
            //'text-color': ['get', 'color'],
            //'text-halo-color': '#eaeaea',
            'text-halo-color': darkMode == true ? '#1d1d1d' : '#eaeaea',
            'text-halo-width': 2.4,
            'text-halo-blur': 1,
            'text-opacity': ['interpolate', ['linear'], ['zoom'], 7.9, 0, 8, 1]
        }
    });

     //OTHER

     map.addLayer({
        id: layerspercategory.other.livedots,
        type: 'circle',
        source: 'other',
        minzoom: 2,
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 10, 6, 16, 10],
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#fff',
            'circle-emissive-strength': 1,
            'circle-stroke-width': 1,
            'circle-opacity': 0.3
        }
    });

    map.addLayer({
        id:  layerspercategory.other.labeldots,
        type: 'symbol',
        source: 'other',
        minzoom: 2,
        layout: {
            'text-field': ['get', 'maptag'],
            /*'text-field': [
                "concat",
                ['get', 'maptag'],
                " | ",
                ['get', 'vehicleId']
            ],*/
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.2,
            'text-font': [
                'step',
                ['zoom'],
                ['literal', ['DIN Pro Regular', 'Arial Unicode MS Regular']],
                9,
                ['literal', ['DIN Pro Bold', 'Arial Unicode MS Medium']],
            ],
            'text-size': ['interpolate', ['linear'], ['zoom'], 9, 14, 11, 15, 13, 16],
            'text-ignore-placement': ['step', ['zoom'], false, 9.5, true]
        },
        paint: {
            'text-color': textColorOfMapLabels(darkMode),
            //'text-halo-color': '#eaeaea',
            'text-halo-color': darkMode == true ? '#1d1d1d' : '#eaeaea',
            'text-halo-width': 2.4,
            'text-halo-blur': 1,
            'text-emissive-strength': 1,
            'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0, 2.5, 0.8, 10, 1]
        }
    });


    //LOCAL RAIL

    map.addLayer({
        id: layerspercategory.localrail.livedots,
        type: 'circle',
        source: 'localrail',
        minzoom: 2,
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 7, 10, 8, 16, 12],
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 1,
            'circle-emissive-strength': 1,
            'circle-opacity': 0.6
        }
    });

    map.addLayer({
        id:  layerspercategory.localrail.labeldots,
        type: 'symbol',
        source: 'localrail',
        minzoom: 2,
        layout: {
            'text-field': ['get', 'maptag'],
            /*'text-field': [
                "concat",
                ['get', 'maptag'],
                " | ",
                ['get', 'vehicleId']
            ],*/
            'text-variable-anchor': ['top'],
            'text-radial-offset': 0,
            'text-font': ['literal', ['DIN Pro Bold', 'Arial Unicode MS Bold']],
            'text-size': ['interpolate', ['linear'], ['zoom'], 9, 14, 11, 16, 13, 18],
            'text-ignore-placement': ['step', ['zoom'], false, 9.5, true]
        },
        paint: {
            'text-color': textColorOfMapLabels(darkMode),
            //'text-halo-color': '#eaeaea',
            'text-halo-color': darkMode == true ? '#1d1d1d' : '#eaeaea',
            'text-halo-width': 2.4,
            'text-halo-blur': 1,
            'text-emissive-strength': 1,
            'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0, 2.5, 0.8, 10, 1]
        }
    });

    //INTERCITY

    map.addLayer({
        id: layerspercategory.intercityrail.livedots,
        type: 'circle',
        source: 'intercityrail',
        minzoom: 2,
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 10, 10, 11, 16, 13],
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 1,
            'circle-emissive-strength': 1,
            'circle-opacity': 0.8
        }
    });

    map.addLayer({
        id:  layerspercategory.intercityrail.labeldots,
        type: 'symbol',
        source: 'intercityrail',
        minzoom: 2,
        layout: {
            'text-field': ['get', 'maptag'],
            /*'text-field': [
                "concat",
                ['get', 'maptag'],
                " | ",
                ['get', 'vehicleId']
            ],*/
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0,
            'text-font': ['literal', ['DIN Pro Bold', 'Arial Unicode MS Bold']],
            'text-size': ['interpolate', ['linear'], ['zoom'], 9, 16, 11, 17, 13, 19],
            'text-ignore-placement': ['step', ['zoom'], false, 9.5, true]
        },
        paint: {
            'text-color': textColorOfMapLabels(darkMode),
            'text-halo-color': darkMode == true ? '#1d1d1d' : '#eaeaea',
            'text-halo-width': 2.4,
            'text-halo-blur': 1,
            'text-emissive-strength': 1,
            'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0, 2.5, 0.8, 10, 1]
        }
    });
}