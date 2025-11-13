export function isTouchDevice(): boolean {
	if (typeof window != 'undefined') {
		return (
			'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
		);
	} else {
		return false;
	}
}

export function smallestEdge(): number {
	if (window.innerHeight > window.innerWidth) {
		return window.innerWidth;
	} else {
		return window.innerHeight;
	}
}

export function useClickOverCentre(): boolean {
	if (typeof window != 'undefined') {
		if (isTouchDevice() && smallestEdge() > 1024) {
			return true;
		}
	} else {
		return false;
	}
}
