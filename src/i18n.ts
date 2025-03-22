import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

//sort like Google / YouTube
const locale_list = ["da", "de", "en", "es", "fr", "ga", "it", "nl", "pl", "pt-PT", "ru", "zh-CN", "zh-TW", "jp", "ko"];

for (let i = 0; i < locale_list.length; i++) {
	register(locale_list[i], () => import(`./locales/${locale_list[i]}.json`));
}

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


export const locales_options: Record<string, string> = {
	en: 'English',
	fr: 'Français',
	es: 'Español',
	da: "Dansk",
	de: 'Deutsch',
	ga: 'Gaeilge',
	ko: '한국어',
	'zh-CN': '中文 (简体)',
	'zh-TW': '中文 (繁體)',
	nl: 'Nederlands',
	jp: '日本語',
	it: 'Italiano',
	pl: "Polski",
	ru: "Русский",
	'pt-PT': 'Português Europeu',
};

export const locales_options_lookup: Record<string, string> = {
	en: 'English',
	fr: 'Français',
	es: 'Español',
	de: 'Deutsch',
	da: "Dansk",
	ga: 'Gaeilge',
	ko: '한국어',
	zh: '中文',
	ru: "Русский",
	'zh-CN': '中文 (简体)',
	'zh-TW': '中文 (繁體)',
	nl: 'Nederlands',
	jp: '日本語',
	it: 'Italiano',
	pl: "Polski",
	'pt-PT': 'Português Europeu',
};