export function occupancy_to_symbol(input: number | null): string {
	let crowd_symbol = '';

	if (input == 0) {
		crowd_symbol = '∅';
	}

	if (input == 1) {
		crowd_symbol = '▢';
	}

	if (input == 2) {
		crowd_symbol = '▣';
	}

	if (input == 3) {
		crowd_symbol = '╬';
	}

	if (input == 4) {
		crowd_symbol = '╬☹╬';
	}

	if (input == 5) {
		crowd_symbol = '■';
	}

	if (input == 8 || input == 6) {
		crowd_symbol = '✗';
	}

	return crowd_symbol;
}
