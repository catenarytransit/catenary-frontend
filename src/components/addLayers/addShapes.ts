import { removeWeekendStops } from "../removeWeekendStops";

export function addShapes(map: any, darkMode: boolean, layerspercategory: any) {
    
			const urlParams = new URLSearchParams(window.location.search);

    //BUS

    map.addLayer({
        id: layerspercategory.bus.shapes,
        type: 'line',
        source: 'busshapes',
        'source-layer': 'busonly',
        filter:
            [
                'all',
                ['!=', ['get', 'onestop_feed_id'], 'f-9-flixbus'],
                [
                    '!',
                    [
                        'all',
                        ['==', 'f-9mu-mts', ['get', 'onestop_feed_id']],
                        ['==', ['coalesce', ['get', 'route_label']], '950']
                    ]
                ],
                [
                    '!',
                    [
                        'all',
                        ['==', 'f-9mu-mts', ['get', 'onestop_feed_id']],
                        ['==', ['coalesce', ['get', 'route_label']], 'Old Town to Airport Shuttle']
                    ]
                ],
                //	['!=', ['get', 'onestop_feed_id'], 'f-9-flixbus'],
                //	['!=', ['get', 'onestop_feed_id'], 'f-u-flixbus']
            ]
        ,
        paint: {
            'line-color': ['concat', '#', ['get', 'color']],
            'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 14, 2.6],
            //'line-opacity': ['step', ['zoom'], 0.7, 7, 0.8, 8, 0.9]
            'line-opacity': 0.4
            // 'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.2, 10, 0.4]
        },
        minzoom: 8
    });

    map.addLayer({
        id: layerspercategory.bus.labelshapes,
        type: 'symbol',
        source: 'busshapes',
        'source-layer': 'busonly',
        filter:
            [
                'all',
                [
                    '!',
                    [
                        'all',
                        ['==', 'f-9mu-mts', ['get', 'onestop_feed_id']],
                        ['==', ['coalesce', ['get', 'route_label']], '950']
                    ]
                ],
                [
                    '!',
                    [
                        'all',
                        ['==', 'f-9mu-mts', ['get', 'onestop_feed_id']],
                        ['==', ['coalesce', ['get', 'route_label']], 'Old Town to Airport Shuttle']
                    ]
                ],
                ['!=', ['get', 'onestop_feed_id'], 'f-9-flixbus'],
                //['!=', ['get', 'onestop_feed_id'], 'f-u-flixbus']
            ]
        ,
        layout: {
            'symbol-placement': 'line',
            //'text-field': ['coalesce', ['get', 'route_label']],
            'text-field': urlParams.get('debug') ?
                ['concat', ['get', 'onestop_feed_id'], "|", ['get', 'shape_id'], "|", ['coalesce', ['get', 'route_label']]] : ['coalesce', ['get', 'route_label']],
            //'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-font': ['literal', ['Open Sans Regular', 'Arial Unicode MS Regular']],
            'text-size': ['interpolate', ['linear'], ['zoom'], 8, 6, 9, 7, 13, 11],
            'text-ignore-placement': false,
            'text-allow-overlap': false,
            'symbol-spacing':
                window?.innerWidth > 750
                    ? ['step', ['zoom'], 200, 12, 120, 13, 130, 15, 130, 20, 200]
                    : ['step', ['zoom'], 200, 12, 100, 13, 110, 15, 100, 20, 200],
            visibility: 'none'
        },
        paint: {
            'text-color': ['concat', '#', ['get', 'text_color']],

            'text-halo-color': ['concat', '#', ['get', 'color']],
            'text-halo-width': 3,
            'text-halo-blur': 0,
            'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.8, 10, 1]
        },
        minzoom: 7
    });

    //OTHER RAIL
    map.addLayer({
        id: layerspercategory.other.shapes,
        type: 'line',
        source: 'notbusshapes',
        'source-layer': 'notbus',
        filter: ['all',
            ['any',
            ['==', 4, ['get', 'route_type']],
            ['==', 6, ['get', 'route_type']],
            ['==', 7, ['get', 'route_type']]
            ]

        ],
        paint: {
            'line-color': ['concat', '#', ['get', 'color']],
            'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 9, 3],
            'line-opacity': 1
        },
        minzoom: 3
    });

    map.addLayer({
        id: layerspercategory.other.labelshapes,
        type: 'symbol',
        source: 'notbusshapes',
        'source-layer': 'notbus',
        filter: ['all',
            ['any',
                ['==', 4, ['get', 'route_type']],
                ['==', 6, ['get', 'route_type']],
                ['==', 7, ['get', 'route_type']]
            ]
        ],
        layout: {
            'symbol-placement': 'line',
            'text-field': ['coalesce', ['get', 'route_label']],
            //'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 3, 7, 9, 9, 13, 11],
            'text-ignore-placement': false,

            'symbol-spacing': ['step', ['zoom'], 20, 6, 40, 9, 70, 13, 80, 15, 100],
            'text-allow-overlap': false,
            visibility: 'none'
        },
        paint: {
            'text-color': ['concat', '#', ['get', 'text_color']],

            'text-halo-color': ['concat', '#', ['get', 'color']],
            'text-halo-width': 3,
            'text-halo-blur': 1
            //'text-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0, 3.5, 0.8, 4, 1]
        },
        minzoom: 3
    });

    //LOCAL RAIL
    map.addLayer({
        id: layerspercategory.localrail.shapes,
        type: 'line',
        source: 'notbusshapes',
        'source-layer': 'notbus',
        filter: ['all',
            ['any',
                ['==', 0, ['get', 'route_type']],
                ['==', 1, ['get', 'route_type']],
                ['==', 5, ['get', 'route_type']],
                ['==', 12, ['get', 'route_type']],
            ]

        ],
        paint: {
            'line-color': ['concat', '#', ['get', 'color']],
            'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 9, 3],
            'line-opacity': 1
        },
        minzoom: 3
    });

    map.addLayer({
        id: layerspercategory.localrail.labelshapes,
        type: 'symbol',
        source: 'notbusshapes',
        'source-layer': 'notbus',
        filter: ['all',
            ['any',
                ['==', 0, ['get', 'route_type']],
                ['==', 1, ['get', 'route_type']],
                ['==', 5, ['get', 'route_type']],
                ['==', 12, ['get', 'route_type']]
            ]
        ],
        layout: {
            'symbol-placement': 'line',
            'text-field': ['coalesce', ['get', 'route_label']],
            //'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 3, 7, 9, 9, 13, 11],
            'text-ignore-placement': false,

            'symbol-spacing': ['step', ['zoom'], 20, 6, 40, 9, 70, 13, 80, 15, 100],
            'text-allow-overlap': false,
            visibility: 'none'
        },
        paint: {
            'text-color': ['concat', '#', ['get', 'text_color']],

            'text-halo-color': ['concat', '#', ['get', 'color']],
            'text-halo-width': 3,
            'text-halo-blur': 1
            //'text-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0, 3.5, 0.8, 4, 1]
        },
        minzoom: 3
    });

    //INTERCITY RAIL

    map.addLayer({
        id: layerspercategory.intercityrail.shapes,
        type: 'line',
        source: 'notbusshapes',
        'source-layer': 'notbus',
        filter: ['all',
            ['any',
                ['==', 2, ['get', 'route_type']],
            ]

        ],
        paint: {
            'line-color': ['concat', '#', ['get', 'color']],
            'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 9, 3],
            'line-opacity': 1
        },
        minzoom: 3
    });

    map.addLayer({
        id:  layerspercategory.intercityrail.labelshapes,
        type: 'symbol',
        source: 'notbusshapes',
        'source-layer': 'notbus',
        filter: ['==', 2, ['get', 'route_type']],
        layout: {
            'symbol-placement': 'line',
            'text-field': ['coalesce', ['get', 'route_label']],
            //'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 3, 7, 9, 9, 13, 11],
            'text-ignore-placement': false,

            'symbol-spacing': ['step', ['zoom'], 20, 6, 40, 9, 70, 13, 80, 15, 100],
            'text-allow-overlap': false,
            visibility: 'none'
        },
        paint: {
            'text-color': ['concat', '#', ['get', 'text_color']],

            'text-halo-color': ['concat', '#', ['get', 'color']],
            'text-halo-width': 3,
            'text-halo-blur': 1
            //'text-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0, 3.5, 0.8, 4, 1]
        },
        minzoom: 3
    });
}