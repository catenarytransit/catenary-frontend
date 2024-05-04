//import {Map} from 'mapbox-gl'
import { get } from 'svelte/store';
import { createGeoJSONCircle, createGeoJSONCircleFeature } from '../geoMathsAssist';
import { dark_mode_store } from '../globalstores';
export function addGeoRadius(map: any) {
    try {
        map.addSource('km_source', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
    
        map.addLayer({
            id: "km_line",
            type: 'line',
                    source: 'km_source',
                    paint: {
                        'line-color': get(dark_mode_store) ? '#dddddd' : '#121212',
                        'line-width': 1.2,
                        'line-emissive-strength': 1,
                    }
        });

        map.addLayer({
            id: "km_text",
            type: 'symbol',
                    source: 'km_source',
                    layout: {
                        "text-field": ["get", "label"],
                        "symbol-placement": "line",
                        "text-size": 8,
                        'symbol-spacing': 150,
                        'text-ignore-placement': true,
					'text-allow-overlap': true,
                    },
                    paint: {
						'text-color': get(dark_mode_store) ? '#ffffff' : '#121212',
						'text-halo-color': get(dark_mode_store) ? '#000030' : '#eeeeee',
						'text-halo-width': 2,
					},
        });
    } catch (err) {console.error(err);}
}

export function setUserCircles(map: any, lng: number, lat: number) {
    const km_source = map.getSource("km_source");
    const numberofpoints: number = 256;

    const distances = [1,2,5,10,20,50];

    const feature_list = distances.map((dist) =>  createGeoJSONCircleFeature([lng, lat], dist, numberofpoints))

    if(km_source) {
        km_source.setData(
            {
                "type": "FeatureCollection",
                "features": 
                    feature_list
                
            
        }
        )
    }
                       
}