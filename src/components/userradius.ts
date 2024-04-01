//import {Map} from 'mapbox-gl'
import { createGeoJSONCircle, createGeoJSONCircleFeature } from '../geoMathsAssist';

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
                        'line-color': '#aaaaaa',
                        'line-width': 1.2,
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
						'text-color': '#eee',
						'text-halo-color': '#003',
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