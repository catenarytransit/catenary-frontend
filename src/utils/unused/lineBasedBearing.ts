export function numberForBearingLengthBus(zoom: number) {
	if (zoom < 11) {
		return 800;
	}

	if (zoom < 12) {
		return 400;
	}

	if (zoom < 12.5) {
		return 250;
	}

	if (zoom < 13) {
		return 160;
	}

	if (zoom < 14) {
		return 120;
	}

	if (zoom < 15) {
		return 80;
	}

	if (zoom < 17) {
		return 50;
	}

	return 20;
}

export function numberForBearingLengthRail(zoom: number) {
	if (zoom < 10) {
		return 1700;
	}

	if (zoom < 11) {
		return 1000;
	}

	if (zoom < 12) {
		return 500;
	}

	if (zoom < 12.5) {
		return 300;
	}

	if (zoom < 13) {
		return 180;
	}

	if (zoom < 14) {
		return 120;
	}

	if (zoom < 15) {
		return 90;
	}

	if (zoom < 17) {
		return 60;
	}

	return 30;
}
