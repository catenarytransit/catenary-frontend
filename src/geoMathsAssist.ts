export function calculateNewCoordinates(
	latitude: number,
	longitude: number,
	bearing: number,
	distance: number
) {
	// taken from: https://stackoverflow.com/a/46410871/13549
	// distance in KM, bearing in degrees

	const R = 6378.1; // Radius of the Earth
	const brng = (bearing * Math.PI) / 180; // Convert bearing to radian
	let lat = (latitude * Math.PI) / 180; // Current coords to radians
	let lon = (longitude * Math.PI) / 180;

	// Do the math magic
	lat = Math.asin(
		Math.sin(lat) * Math.cos(distance / R) + Math.cos(lat) * Math.sin(distance / R) * Math.cos(brng)
	);
	lon += Math.atan2(
		Math.sin(brng) * Math.sin(distance / R) * Math.cos(lat),
		Math.cos(distance / R) - Math.sin(lat) * Math.sin(lat)
	);

	// Coords back to degrees and return
	return { latitude: (lat * 180) / Math.PI, longitude: (lon * 180) / Math.PI };
}

export function createGeoJSONCircle(center: number[], radiusInKm: number, points: number) {
	const coords = {
		latitude: center[1],
		longitude: center[0]
	};

	const ret = [];
	const distanceX = radiusInKm / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
	const distanceY = radiusInKm / 110.574;

	let theta, x, y;
	for (let i = 0; i < points; i++) {
		theta = (i / points) * (2 * Math.PI);
		x = distanceX * Math.cos(theta);
		y = distanceY * Math.sin(theta);

		ret.push([coords.longitude + x, coords.latitude + y]);
	}
	ret.push(ret[0]);

	return {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [ret]
				},
				properties: {}
			}
		]
	};
}

export function componentToHex(c: number) {
	var hex = Math.round(c).toString(16);
	return hex.length == 1 ? '0' + hex : hex;
}
