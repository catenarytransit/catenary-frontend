import { componentToHex } from '../geoMathsAssist';
import { hexToRgb, rgbToHsl, hslToRgb } from '../utils/colour';
export function lightenColour(inputstring: string): string {
	//convert hex colour to array of 3 numbers

	let contrastdarkmode = inputstring;

	const rgb = hexToRgb(inputstring);

	// console.log('rgb', rgb)

	if (rgb != null) {
		const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

		// console.log('hsl', hsl)

		const newdarkhsl = hsl;

		let blueoffset = 0;

		if (rgb.b > 40) {
			blueoffset = 30 * (rgb.b / 255);
		}

		if (hsl.l < 60) {
			newdarkhsl.l = hsl.l + 10 + (25 * ((100 - hsl.s) / 100) + blueoffset);

			if (hsl.l > 60) {
				if (blueoffset === 0) {
					hsl.l = 60;
				} else {
					hsl.l = 60 + blueoffset;
				}
			}
		}

		if (hsl.l < 60) {
			hsl.l = hsl.l + (100 - hsl.l) * 0.4;
		}

		//console.log('hsl h, s, l', newdarkhsl.h, newdarkhsl.s, newdarkhsl.l)

		//hsl.s = Math.max(100, Math.min(hsl.s + 40, 100));

		const newdarkrgb = hslToRgb(newdarkhsl.h, newdarkhsl.s, newdarkhsl.l);

		contrastdarkmode = `#${componentToHex(newdarkrgb.r)}${componentToHex(
			newdarkrgb.g
		)}${componentToHex(newdarkrgb.b)}`;
		//  console.log('rgbtohex',contrastdarkmode)
	}

	return contrastdarkmode;
}

export function darkenColour(inputstring: string): string {
	//convert hex colour to array of 3 numbers

	let contrastlightmode = inputstring;

	let rgb = hexToRgb(inputstring);

	// console.log('rgb', rgb)

	if (rgb != null) {
		let hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

		// console.log('hsl', hsl)

		//
		if (hsl.l < 50) {
			hsl.l = 0.5 * (hsl.l - 60) + 60;
		}

		const newrgb = hslToRgb(hsl.h, hsl.s, hsl.l);

		contrastlightmode = `#${componentToHex(newrgb.r)}${componentToHex(
			newrgb.g
		)}${componentToHex(newrgb.b)}`;
	}

	return contrastlightmode;
}
