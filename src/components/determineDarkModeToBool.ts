import { get } from 'svelte/store';
import { ui_theme_store } from '../globalstores';

export function determineDarkModeToBool() {
	if (typeof window != 'undefined') {
		let ui_theme_grab = get(ui_theme_store);

		if (ui_theme_grab == 'system') {
			const checkIsDarkSchemePreferred = () =>
				window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ?? false;

			return checkIsDarkSchemePreferred();
		} else if (ui_theme_grab == 'dark') {
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}
