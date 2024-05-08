import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

register('en', () => import('./locales/en.json'));
register('de', () => import('./locales/de.json'));
register('fr', () => import('./locales/fr.json'));
register('es', () => import('./locales/es.json'));
register('ko', () => import('./locales/ko.json'));
register('zh', () => import('./locales/zh.json'));
register('zh-TW', () => import('./locales/zh.json'));

export function init_locales() {
    init({
        fallbackLocale: 'en',
        initialLocale: getLocaleFromNavigator(),
      });
}