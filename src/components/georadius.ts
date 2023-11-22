//import {Map} from 'mapbox-gl'
import { createGeoJSONCircle } from '../geoMathsAssist';

export function addGeoRadius(map: any) {
    try {
        map.addSource('onekmsource', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
    
        map.addLayer({
            id: "onekm",
            type: 'line',
                    source: 'onekmsource',
                    paint: {
                        'line-color': '#aaaaaa',
                        'line-width': 1.2,
                    }
        });

        map.addLayer({
            id: "onekmtext",
            type: 'symbol',
                    source: 'onekmsource',
                    layout: {
                        "text-field": "1km",
                        "symbol-placement": "line",
                        "text-size": 10,
                        'symbol-spacing': 100,
                        'text-ignore-placement': true,
					'text-allow-overlap': true,
                    },
                    paint: {
						'text-color': '#eee',
						'text-halo-color': '#003',
						'text-halo-width': 2
					},
        });

        map.addSource('tenkmsource', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
    
        map.addLayer({
            id: "tenkm",
            type: 'line',
                    source: 'tenkmsource',
                    paint: {
                        'line-color': '#aaaaaa',
                        'line-width': 1.2,
                    }
        });

        map.addLayer({
            id: "tenkmtext",
            type: 'symbol',
                    source: 'tenkmsource',
                    layout: {
                        "text-field": "10km",
                        "symbol-placement": "line",
                        "text-size": 10,
                        'symbol-spacing': 100,
                        'text-ignore-placement': true,
					'text-allow-overlap': true,
                    },
                    paint: {
						'text-color': '#eee',
						'text-halo-color': '#003',
						'text-halo-width': 2
					},
        });
    } catch (err) {console.error(err);}
}

export function setUserCircles(map: any, lng: number, lat: number) {
    let onekmlayer = map.getSource('onekmsource');
    const numberofpoints: number = 256;

    if (onekmlayer) {

        let geojsondata = createGeoJSONCircle([lng, lat], 1, numberofpoints);

        onekmlayer.setData(geojsondata);
    }

    let tenkmlayer = map.getSource('tenkmsource');

    if (tenkmlayer) {
        let geojsondata_10km = createGeoJSONCircle([lng, lat], 10, numberofpoints);
        tenkmlayer.setData(geojsondata_10km);
    }
                       
}