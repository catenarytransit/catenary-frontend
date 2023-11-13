//import {Map} from 'mapbox-gl'
import { createGeoJSONCircle } from '../geoMathsAssist';

export function addGeoRadius(map: any) {
    map.addLayer("1km", {
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
    let numberofpoints: number = 256;

							let geojsondata = createGeoJSONCircle(
								[lng, lat],
								1,
								numberofpoints
							);

                            let layer = map.getLayer("1km");

                            if (layer) {
							layer.setData(geojsondata);
                            }
}