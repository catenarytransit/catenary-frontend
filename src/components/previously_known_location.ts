export interface MyPreviouslyKnownLocation {
	time: number;
	latitude: number;
	longitude: number;
}

export function saveLocationToLocalStorage(location: MyPreviouslyKnownLocation) {
	localStorage.setItem('previously_known_locations', JSON.stringify(location));
}

export function getLocationFromLocalStorage(): MyPreviouslyKnownLocation | null {
	const location = localStorage.getItem('previously_known_locations');
	if (location) {
		return JSON.parse(location);
	}
	return null;
}
