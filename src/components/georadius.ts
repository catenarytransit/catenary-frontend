//import {Map} from 'mapbox-gl'
import { createGeoJSONCircle } from '../geoMathsAssist';

export function addGeoRadius(map: any) {
    map.addLayer("onekm", {
        type: 'fill',
				source: 'userpositionacc',
				paint: {
					'fill-color': '#000000',
					'fill-opacity': 0,
                    'line-color': '#aaaaff'
				}
    });
}

export function setUserCircles(map: any, lng: number, lat: number) {
  
                       
}