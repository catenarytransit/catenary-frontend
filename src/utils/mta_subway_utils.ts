export const MTA_CHATEAU_ID = 'nyct';

export function getMtaSubwayClass(shortName: string): string {
	const s = shortName.toUpperCase();
	const subwayRouteClasses: { [key: string]: string } = {
		'1': 'mta-red',
		'2': 'mta-red',
		'3': 'mta-red',
		'4': 'mta-green',
		'5': 'mta-green',
		'6': 'mta-green',
		'6X': 'mta-green',
		A: 'mta-blue',
		C: 'mta-blue',
		E: 'mta-blue',
		B: 'mta-orange',
		D: 'mta-orange',
		F: 'mta-orange',
		FX: 'mta-orange',
		M: 'mta-orange',
		G: 'mta-green-2',
		J: 'mta-brown',
		Z: 'mta-brown',
		L: 'mta-gray',
		N: 'mta-yellow',
		Q: 'mta-yellow',
		R: 'mta-yellow',
		W: 'mta-yellow',
		GS: 'mta-gray',
		FS: 'mta-gray',
		H: 'mta-gray', // Shuttles
		'7': 'mta-purple',
		'7X': 'mta-purple'
	};
	return subwayRouteClasses[s] || '';
}

export function getMtaSymbolShortName(shortName: string): string {
	const s = shortName.toUpperCase();
	if (s === '6X') return '6';
	if (s === '7X') return '7';
	if (s === 'FX') return 'F';
	if (s === 'GS' || s === 'FS' || s === 'H') return 'S';
	return shortName;
	// For Staten Island Railway, it's not a subway, so we don't include it here.
}

const SUBWAY_ROUTE_IDS = new Set([
	'A',
	'C',
	'E',
	'B',
	'D',
	'F',
	'FX',
	'M',
	'G',
	'J',
	'Z',
	'L',
	'N',
	'Q',
	'R',
	'W',
	'GS',
	'FS',
	'H',
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'6X',
	'7',
	'7X'
]);

export function isSubwayRouteId(routeId: string): boolean {
	return SUBWAY_ROUTE_IDS.has(routeId.toUpperCase());
}

export function isExpress(routeId: string): boolean {
	return routeId.toUpperCase().endsWith('X');
}
