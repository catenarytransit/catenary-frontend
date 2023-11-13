//import {Map} from 'mapbox-gl'
import { createGeoJSONCircle } from '../geoMathsAssist';

export function addGeoRadius(map: any) {
    map.addSource('onekmsource', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    map.addLayer({
        id: "onekm",
        type: 'fill',
				source: 'onekmsource',
				paint: {
					'fill-color': '#000000',
					'fill-opacity': 0,
                    'line-color': '#aaaaff'
				}
    });
}

export function setUserCircles(map: any, lng: number, lat: number) {
    let onekmlayer = map.getSource('onekmsource');

    if (onekmlayer) {
        let numberofpoints: number = 256;

        let geojsondata = createGeoJSONCircle([lng, lat], 1, numberofpoints);

        onekmlayer.setData(geojsondata);
    }
                       
}