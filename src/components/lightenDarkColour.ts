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

		hsl.l = Math.min(100, hsl.l);
		const newdarkrgb = hslToRgb(newdarkhsl.h, newdarkhsl.s, newdarkhsl.l);

		contrastdarkmode = `#${componentToHex(newdarkrgb.r)}${componentToHex(
			newdarkrgb.g
		)}${componentToHex(newdarkrgb.b)}`;
		//  console.log('rgbtohex',contrastdarkmode)
	}

	return contrastdarkmode;
}
