const interleave = (arr: any, thing: any) =>
	[].concat(...arr.map((n: any) => [n, thing])).slice(0, -1);

export function interpretLabelsToCode(label: any, usunits: boolean) {
	const arrayofinfo = [];

	if (label.route) {
		arrayofinfo.push(['get', 'maptag']);
	}

	if (label.trip) {
		arrayofinfo.push(['get', 'tripIdLabel']);
	}

	if (label.vehicle) {
		arrayofinfo.push(['get', 'vehicleIdLabel']);
	}

	if (label.headsign) {
		arrayofinfo.push(['get', 'headsign']);
	}

	if (label.speed) {
		//round to 0.1 place
		let unitmultiplier = 36;
		if (usunits === true) {
			unitmultiplier = 22.3694;
		}

		//arrayofinfo.push(['case', true, ['/', ['round', ['*', ['get', 'speed'], unitmultiplier]], 10]])
		arrayofinfo.push(['get', 'speed']);
		//arrayofinfo.push(['get', 'speedtype'])
	}

	if (label.occupancy) {
		arrayofinfo.push(['get', 'crowd_symbol']);
	}

	if (label.delay) {
		arrayofinfo.push(['get', 'delay_label']);
	}

	return ['concat', ...interleave(arrayofinfo, '|')];
}
