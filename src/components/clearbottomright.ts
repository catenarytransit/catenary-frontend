export function clearbottomright() {
	const bottomright = document.getElementsByClassName('mapboxgl-ctrl-bottom-right');

	if (bottomright) {
		if (bottomright[0] != undefined) {
			bottomright[0].remove();
		}
	}

	//console.log('requested rerender of ', rerenders_requested)
}
