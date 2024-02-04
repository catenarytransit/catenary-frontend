import type { Map } from "mapbox-gl";
import { removeWeekendStops } from "../removeWeekendStops";

const northAmericaIntercityLabelSize = ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 12];
const internationalIntercityLabelSize = ['interpolate', ['linear'], ['zoom'], 6, 8, 12, 12];

export function changeRailTextOutsideNorthAmerica(map:Map, layerspercategory:any) {
    console.log('change rail size out side na')
    const centre = map.getCenter();
    if (centre.lng >= -52) {
        console.log('set to international stop size')
        map.setLayoutProperty(layerspercategory.intercityrail.labelstops,"text-size", 
        internationalIntercityLabelSize);
    } else {
        console.log('set to na stop size')
        map.setLayoutProperty(layerspercategory.intercityrail.labelstops,"text-size", 
        northAmericaIntercityLabelSize);
    }
}


export function addStopsLayers(map:any, darkMode:boolean, layerspercategory:any) {
      //BUS

      map.addLayer({
        id: layerspercategory.bus.stops,
        type: 'circle',
        source: 'busstops',
        'source-layer': 'busstops',
        layout: {},
        paint: {
            'circle-color': '#1c2636',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 0.9, 12, 1.2, 13, 2],
            'circle-stroke-color': darkMode
                ? ['step', ['zoom'], '#e0e0e0', 14, '#dddddd']
                : '#333333',
            'circle-stroke-width': ['step', ['zoom'], 1.2, 13.2, 1.5],
            'circle-stroke-opacity': ['step', ['zoom'], 0.5, 15, 0.6],
            'circle-opacity': 0.1,
            'circle-emissive-strength': 1
        },
        minzoom: window?.innerWidth >= 768 ? 13 : 12,
        filter: removeWeekendStops(['all',
    
        ['!', ['in', 1, ['get', 'route_types']]],
        ['!', ['in', 0, ['get', 'route_types']]],
        ['!', ['in', 2, ['get', 'route_types']]]])
    });

    map.addLayer({
        id: layerspercategory.bus.labelstops,
        type: 'symbol',
        source: 'busstops',
        'source-layer': 'busstops',
        filter: removeWeekendStops(['all', 
        ['!', ['in', 1, ['get', 'route_types']]],
        ['!', ['in', 0, ['get', 'route_types']]],
        ['!', ['in', 2, ['get', 'route_types']]]
    ]),
        layout: {
            'text-field': ['get', 'displayname'],
            //'text-field': ['coalesce', ['get', 'route_types']],
            'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
            'text-size': 10,
            'text-radial-offset': 0.7,
            //'text-ignore-placement': false,
            //'icon-ignore-placement': false,
            //'text-allow-overlap': true,
            //'symbol-avoid-edges': false,
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular']
        },
        paint: {
            'text-color': darkMode ? '#eee6fe' : '#2a2a2a',
            'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
            'text-halo-width': 0.4,
            'text-emissive-strength': 1
        },
        minzoom: window?.innerWidth >= 768 ? 14 : 13
    });
   
    
   
    //LOCAL RAIL
   
    map.addLayer({
        id: layerspercategory.localrail.stops,
        type: 'circle',
        source: 'railstops',
        'source-layer': 'railstops',
        layout: {},
        paint: {
            'circle-color': '#1c2636',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 4, 15, 5],
            'circle-stroke-color': darkMode
                ? ['step', ['zoom'], '#e0e0e0', 14, '#dddddd']
                : '#333333',
            'circle-stroke-width': ['step', ['zoom'], 1.2, 13.2, 1.5],
            'circle-stroke-opacity': ['step', ['zoom'], 0.5, 15, 0.6],
            'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 16, 0.8],
            'circle-emissive-strength': 1
        },
        minzoom: 8,
        filter: removeWeekendStops(['all',
        [
            'all',
            [
                'any',
                ['>',['zoom'],16],
                ['==', null, ['get', "parent_station"]]
            ],
            ['any',
            ['in', 0, ['get', 'route_types']],
            ['in', 0, ['get', "children_route_types"]],
            ['in', 1, ['get', 'route_types']],
            ['in', 1, ['get', "children_route_types"]]
            ],
            ['!',['in', 2, ['get', "children_route_types"]]]
        ],
        ])
    });
    
    map.addLayer({
        id: layerspercategory.localrail.labelstops,
        type: 'symbol',
        source: 'railstops',
        'source-layer': 'railstops',
        layout: {
            'text-field': ['get', 'displayname'],
            'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 11, 10, 12, 12],
            'text-radial-offset': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 12, 0.9],
            //'text-ignore-placement': true,
            //'icon-ignore-placement': false,
            //'text-allow-overlap': true,
            //'symbol-avoid-edges': false,
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            
        },
        paint: {
            
            'text-color': darkMode ? '#ffffff' : '#2a2a2a',
            'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
            'text-halo-width': 1,
            'text-emissive-strength': 1,
        },
        filter: [
            'all',
            [
                'any',
                ['>',['zoom'],16],
                ['==', null, ['get', "parent_station"]]
                
            ],
            ['any',
            ['in', 0, ['get', 'route_types']],
            ['in', 0, ['get', "children_route_types"]],
            ['in', 1, ['get', 'route_types']],
            ['in', 1, ['get', "children_route_types"]]
            ],
            ['!',['in', 2, ['get', "children_route_types"]]]
        ],
        minzoom: 11
    });

    //INTERCITY RAIL

   map.addLayer({
    id: layerspercategory.intercityrail.stops,
    type: 'circle',
    source: 'railstops',
    'source-layer': 'railstops',
    layout: {},
    paint: {
        'circle-color': '#1c2636',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 4, 12, 6, 15, 8],
        'circle-stroke-color': darkMode
            ? ['step', ['zoom'], '#e0e0e0', 14, '#dddddd']
            : '#333333',
        'circle-stroke-width': ['step', ['zoom'], 1.2, 13.2, 1.5],
        'circle-stroke-opacity': ['step', ['zoom'], 0.5, 15, 0.6],
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.5, 12, 0.8],
        'circle-emissive-strength': 1
    },
    minzoom: 7,
    filter: removeWeekendStops(['all',
    [
        'all',
        [
            'any',
            ['>',['zoom'],15],
            ['==', null, ['get', "parent_station"]]
        ],
        ['any',
        ['in', 2, ['get', 'route_types']],
        ['in', 2, ['get', "children_route_types"]]
        ]
    ],
    ])
});

map.addLayer({
    id: layerspercategory.intercityrail.labelstops,
    type: 'symbol',
    source: 'railstops',
    'source-layer': 'railstops',
    layout: {
        'text-field': ['get', 'displayname'],
        'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
        'text-size': northAmericaIntercityLabelSize,
        'text-radial-offset': 1,
        //'text-ignore-placement': true,
        //'icon-ignore-placement': false,
        //'text-allow-overlap': true,
        //'symbol-avoid-edges': false,
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Regular'],
        
    },
    paint: {
        
        'text-color': darkMode ? '#ffffff' : '#2a2a2a',
        'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
        'text-halo-width': 1,
        'text-emissive-strength': 1
    },
    filter: [
        'all',
        [
            'any',
            ['>',['zoom'],15],
            ['==', null, ['get', "parent_station"]]
            
        ],
        ['any',
        ['in', 2, ['get', 'route_types']],
        ['in', 2, ['get', "children_route_types"]]
        ]
    ],
    minzoom: 7
});

   //OTHER

   map.addLayer({
    id: layerspercategory.other.stops,
    type: 'symbol',
    source: 'railstops',
    'source-layer': 'railstops',
    layout: {
        'text-field': ['get', 'displayname'],
        'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 6, 15, 9, 17, 10],
        'text-radial-offset': 1,
        //'text-ignore-placement': true,
        //'icon-ignore-placement': false,
        //'text-allow-overlap': true,
        //'symbol-avoid-edges': false,
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Regular'],
        
    },
    paint: {
        
        'text-color': darkMode ? '#eee6fe' : '#2a2a2a',
        'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
        'text-halo-width': 1,
        'text-emissive-strength': 1
    },
    filter: [
        'all',
        [
            'any',
            ['>',['zoom'],16],['==', null, ['get', "parent_station"]]
            
        ],
        ['any',
        ['in', 4, ['get', 'route_types']],
        ['in', 6, ['get', "children_route_types"]],
        ['in', 6, ['get', 'route_types']],
        ['in', 6, ['get', "children_route_types"]],
        ['in', 7, ['get', 'route_types']],
        ['in', 7, ['get', "children_route_types"]]
        ],
        
        ['!',['in', 0, ['get', "children_route_types"]]],
        ['!',['in', 2, ['get', "children_route_types"]]],
        ['!',['in', 1, ['get', "children_route_types"]]],
        ['!',['in', 0, ['get', "route_types"]]],
        ['!',['in', 1, ['get', "route_types"]]],
        ['!',['in', 2, ['get', "route_types"]]]
    ],
    minzoom: 9
});

   map.addLayer({
    id: layerspercategory.other.labelstops,
    type: 'symbol',
    source: 'railstops',
    'source-layer': 'railstops',
    layout: {
        'text-field': ['get', 'displayname'],
        'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 6, 15, 9, 17, 10],
        'text-radial-offset': 1,
        //'text-ignore-placement': true,
        //'icon-ignore-placement': false,
        //'text-allow-overlap': true,
        //'symbol-avoid-edges': false,
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Regular'],
        
    },
    paint: {
        
        'text-color': darkMode ? '#eee6fe' : '#2a2a2a',
        'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
        'text-halo-width': 1,
        'text-emissive-strength': 1
    },
    filter: [
        'all',
        [
            'any',
            ['>',['zoom'],16],
            ['==', null, ['get', "parent_station"]]
            
        ],
        ['any',

        ],
        ['!',['in', 0, ['get', "children_route_types"]]],
        ['!',['in', 1, ['get', "children_route_types"]]],
        ['!',['in', 2, ['get', "children_route_types"]]],
        
        ['!',['in', 0, ['get', "route_types"]]],
        ['!',['in', 1, ['get', "route_types"]]],
        ['!',['in', 2, ['get', "route_types"]]],
    ],
    minzoom: 9
});

 
changeRailTextOutsideNorthAmerica(map, layerspercategory);

}