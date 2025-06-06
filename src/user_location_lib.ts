import { addGeoRadius, setUserCircles } from './components/userradius';
import { show_my_location_store, geolocation_store, map_pointer_store } from './globalstores';
export const permission_to_geolocate = 'permission_to_geolocate';
import { get } from 'svelte/store';
import { createGeoJSONCircle, componentToHex } from './geoMathsAssist';

import { writable } from 'svelte/store';
import {saveLocationToLocalStorage} from './components/previously_known_location';

let geolocation: GeolocationPosition | null;

geolocation_store.subscribe((g) => {
	geolocation = g;
});

export function start_location_watch() {
	if (typeof navigator != "undefined") {
			if (typeof window != 'undefined') {
				function success(pos: GeolocationPosition ) {
					geolocation_store.set(pos);
			
					update_geolocation_source();
				  }
			
				  setInterval(() => {
					update_geolocation_source()
				  }, 1000)
			
				const options = {
					enableHighAccuracy: false,
					timeout: 5000,
					// 30 seconds
					maximumAge: 30_000,
				  };
				  
				 const id = navigator.geolocation.watchPosition(success, () => {}, options);
			}
		
	}
}

export function has_permission_to_geolocate(): boolean {
	const check = window.localStorage.getItem(permission_to_geolocate);

	if (check == null) {
		return false;
	} else {
		if (check == 'true') {
			return true;
		} else {
			return false;
		}
	}
}

export function ask_for_user_location_permission() {}

export function update_geolocation_source() {
//	console.log('updating geolocation source');

	const map = get(map_pointer_store);

	if (map != null) {

		if (geolocation?.coords) {
			
		saveLocationToLocalStorage({
			time: Date.now(),
			latitude: geolocation?.coords.latitude,
			longitude: geolocation?.coords.longitude
		});
		}

		
	const show_my_location = get(show_my_location_store);

	const geolocation_mapsource = map.getSource('user_geolocation');

	if (geolocation_mapsource) {
		if (geolocation) {
			if (geolocation.coords) {
				geolocation_mapsource.setData({
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [geolocation.coords.longitude, geolocation.coords.latitude]
							},
							properties: {
								accuracy: geolocation.coords.accuracy,
								heading: geolocation.coords.heading
							}
						}
					]
				});

				setUserCircles(map, geolocation.coords.longitude, geolocation.coords.latitude);

				if (geolocation.coords.accuracy) {
					let accuracyLayer = map.getSource('userpositionacc');

					if (accuracyLayer) {
						let numberofpoints: number = 128;

						let geojsondata: any = createGeoJSONCircle(
							[geolocation.coords.longitude, geolocation.coords.latitude],
							geolocation.coords.accuracy / 1000,
							numberofpoints
						);

						geojsondata.features[0].properties.opacity = 0.2;

						if (geolocation.coords.accuracy >= 1000) {
							geojsondata.features[0].properties.opacity = 0.05;
						}

						if (geolocation.coords.accuracy >= 2000) {
							geojsondata.features[0].properties.opacity = 0.02;
						}

						if (geolocation.coords.accuracy >= 5000) {
							geojsondata.features[0].properties.opacity = 0.01;
						}

						accuracyLayer.setData(
							geojsondata,
							geolocation.coords.longitude,
							geolocation.coords.latitude
						);
					}
				}

				let nobearingposlayer = map.getLayer('nobearing_position');
				let bearingposlayer = map.getLayer('bearing_position');

				if (geolocation.coords.heading) {
					console.log('bearing is', geolocation.coords.heading);

					if (show_my_location) {
						map.setLayoutProperty('nobearing_position', 'visibility', 'none');

						map.setLayoutProperty('bearing_position', 'visibility', 'visible');
					} else {
						map.setLayoutProperty('bearing_position', 'visibility', 'none');
						map.setLayoutProperty('nobearing_position', 'visibility', 'none');
					}
				} else {
					if (nobearingposlayer) {
						if (show_my_location) {
							map.setLayoutProperty('nobearing_position', 'visibility', 'visible');
						} else {
							map.setLayoutProperty('nobearing_position', 'visibility', 'none');
						}
					}

					if (bearingposlayer) {
						map.setLayoutProperty('bearing_position', 'visibility', 'none');
					}
				}
			}
		}
	}
	} else {
		console.log('no map for geolocation');
	}

}
