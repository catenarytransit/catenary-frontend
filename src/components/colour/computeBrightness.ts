export function calculateGamma(r: number, g: number, b: number): number {
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
