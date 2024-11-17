import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

register('de', () => import('./locales/de.json'));
register('en', () => import('./locales/en.json'));
register('es', () => import('./locales/es.json'));
register('fr', () => import('./locales/fr.json'));
register('nl', () => import('./locales/nl.json'));
register('zh-CN', () => import('./locales/zh-CN.json'));
register('zh-TW', () => import('./locales/zh-TW.json'));
register('ko', () => import('./locales/ko.json'));

export function getLocaleStorageOrNav() {
	if (typeof window != 'undefined') {
		if (window.localStorage.language && window.localStorage.language !== 'undefined') {
			return window.localStorage.language;
		} else {
			return getLocaleFromNavigator();
		}
	} else {
		return getLocaleFromNavigator();
	}
}

export function init_locales() {
	init({
		fallbackLocale: 'en',
		initialLocale: getLocaleStorageOrNav()
	});
}
