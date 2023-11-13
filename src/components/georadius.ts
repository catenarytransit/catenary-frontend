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
                        'line-color': '#aaaaff',
                        'line-width': 1.2,
                    }
        });
    } catch (err) {console.error(err);}
}

export function setUserCircles(map: any, lng: number, lat: number) {
    let onekmlayer = map.getSource('onekmsource');

    if (onekmlayer) {
        let numberofpoints: number = 256;

        let geojsondata = createGeoJSONCircle([lng, lat], 1, numberofpoints);

        onekmlayer.setData(geojsondata);
    }
                       
}