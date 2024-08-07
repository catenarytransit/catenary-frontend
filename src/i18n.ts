import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

register('en', () => import('./locales/en.json'));
register('de', () => import('./locales/de.json'));
register('fr', () => import('./locales/fr.json'));
register('es', () => import('./locales/es.json'));
register('ko', () => import('./locales/ko.json'));
register('zh-CN', () => import('./locales/zh-CN.json'));
register('zh-TW', () => import('./locales/zh-TW.json'));

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
