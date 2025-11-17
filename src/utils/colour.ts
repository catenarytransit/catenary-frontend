export function hexToRgb(hex: string) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			}
		: null;
}

export function rgbToHsl(r: number, g: number, b: number) {
	r /= 255;
	g /= 255;
	b /= 255;
	const l = Math.max(r, g, b);
	const s = l - Math.min(r, g, b);
	const h = s ? (l === r ? (g - b) / s : l === g ? 2 + (b - r) / s : 4 + (r - g) / s) : 0;
	return {
		h: 60 * h < 0 ? 60 * h + 360 : 60 * h,
		s: 100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
		l: (100 * (2 * l - s)) / 2
	};
}

export function hslToRgb(h: number, s: number, l: number) {
	s /= 100;
	l /= 100;
	const k = (n: any) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: any) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return { r: 255 * f(0), g: 255 * f(8), b: 255 * f(4) };
}

export function srgbToLinear(c: number): number {
	c /= 255;
	return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(r: number, g: number, b: number): number {
	const R = srgbToLinear(r);
	const G = srgbToLinear(g);
	const B = srgbToLinear(b);
	return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function brightenForDarkModeKeepSat(
	rgb: { r: number; g: number; b: number },
	minLuminance = 0.18
): { r: number; g: number; b: number } {
	const { r, g, b } = rgb;

	// Current luminance
	const currentLum = relativeLuminance(r, g, b);

	// Already bright enough? Don't darken.
	if (currentLum >= minLuminance) {
		return rgb;
	}

	// Convert to HSL (your function: h in [0..360], s/l in [0..100])
	const { h, s, l } = rgbToHsl(r, g, b);

	// Sample luminance at "max lightness" with the same hue/sat
	const rgbAtMax = hslToRgb(h, s, 100);
	const lumAtMax = relativeLuminance(rgbAtMax.r, rgbAtMax.g, rgbAtMax.b);

	// If even fully light can't reach the target, just clamp to max lightness
	if (lumAtMax <= currentLum || lumAtMax <= minLuminance) {
		return {
			r: Math.round(rgbAtMax.r),
			g: Math.round(rgbAtMax.g),
			b: Math.round(rgbAtMax.b)
		};
	}

	// Linear interpolation in lightness:
	//   lum(L) ≈ lum(L0) + (lum(Lmax) - lum(L0)) * (L - L0) / (Lmax - L0)
	// Solve for L when lum(L) = minLuminance
	const t = (minLuminance - currentLum) / (lumAtMax - currentLum);
	const lPrime = l + t * (100 - l); // L' in [l,100]

	const rgbOut = hslToRgb(h, s, lPrime);

	return {
		r: Math.round(rgbOut.r),
		g: Math.round(rgbOut.g),
		b: Math.round(rgbOut.b)
	};
}