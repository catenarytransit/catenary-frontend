//make a socket connection to the server ws.catenarymaps.org
//throw submissions at it :)

function isValidGeolocation(geolocation: GeolocationPosition) {
	//throw out any locations with accuracy > 20 meters
	if (geolocation.coords.accuracy < 20) {
		return false;
	}

	//require speed submission because speed is a good indicator of a mobile device
	//additionally, this ensures that mobile devices are not submitting static locations
	if (geolocation.coords.speed === null) {
		return false;
	}

	//no null values
	if (geolocation.coords.latitude === null || geolocation.coords.longitude === null) {
		return false;
	}

	//no submissions at or around null island
	if (geolocation.coords.latitude === 0 || geolocation.coords.longitude === 0) {
		return false;
	}

	if (
		Math.abs(geolocation.coords.latitude) < 0.01 &&
		Math.abs(geolocation.coords.longitude) < 0.01
	) {
		return false;
	}

	return true;
}
