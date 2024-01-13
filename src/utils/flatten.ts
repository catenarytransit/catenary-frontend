export function flatten(arr: any) {
	return arr.reduce(function (flat: any, toFlatten: any) {
		return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
	}, []);
}
