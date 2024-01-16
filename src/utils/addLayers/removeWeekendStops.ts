export function removeWeekendStops(inputarray: any[]) {
	//if it is currently a weekend in california
	const result  = inputarray;
	const dayinla = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })).getDay();

	if (dayinla == 6 || dayinla == 0) {
		result.push(['!=', ['get', 'onestop_feed_id'], 'f-anteaterexpress']);
	}

	return result;
}
