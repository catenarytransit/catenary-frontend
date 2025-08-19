<script lang="ts">
    	import { getLocaleFromNavigator, locale, locales, _ } from 'svelte-i18n';
    import { get } from 'svelte/store';
    import { data_stack_store, usunits_store, show_gtfs_ids_store, ui_theme_store, show_seconds_store } from '../globalstores';
	import HomeButton from './SidebarParts/home_button.svelte';
    
	import {locales_options, locales_options_lookup} from '../i18n';

        import { commitId } from '../data/commitId.js';

	let this_locale: string | undefined | null;
	import { getLocaleStorageOrNav } from '../i18n';
	import { init_stores } from './init_stores';
    init_stores();

	let show_seconds = get(show_seconds_store);

    let theme_selector = get(ui_theme_store);

    ui_theme_store.subscribe((value) => {
        theme_selector = value;
    });

    	function locale_code_to_name(locale: string | null | undefined) {
		if (locale == null || locale == undefined) {
			return '--';
		} else {
			let temp = locales_options_lookup[locale];
			if (temp == null || temp == undefined) {
				return locale;
			} else {
				return temp;
			}
		}
	}

    locale.subscribe((newval) => {
		this_locale = newval;
	});

        let show_gtfs_ids = get(show_gtfs_ids_store);

        show_gtfs_ids_store.subscribe((value) => {
          show_gtfs_ids = value;
        });

        const buildDate = _BUILD_DATE;

</script>

<HomeButton />
		<div class="px-3 pt-1 flex flex-col h-full select-text">
			<h1 class="text-3xl font-medium mb-2">{$_('settings')}</h1>
			<span class="text-xl block">{$_('language')}</span>
				<p>{$locale}</p>
			<select
				bind:value={$locale}
				class="text-black bg-white dark:bg-slate-900 dark:text-white p-1 border-2 my-1 border-seashore dark:border-seashoredark rounded-md"
			>
				{#each $locales as locale}
					<option value={locale} class="text-black bg-white dark:bg-slate-900 dark:text-white"
						>{locale_code_to_name(locale)}</option
					>
				{/each}
			</select>
			<span class="block my-2"></span>
			<span class="text-xl block mb-1">{$_('mapstyle')}</span>

            <!-- Radio selector -->
<div class="mb-2">
            <div class="">
                <input
                    type="radio"
                    id="system"
                    name="system"
                    value="system"
                    checked={theme_selector === 'system'}
                    on:click={() => {
                        ui_theme_store.set('system');
                    }}
                />
                <label for="system">{$_('system_theme')}</label>
            </div>
            <div>
                <input
                    type="radio"
                    id="light"
                    name="light"
                    value="light"
                    checked={theme_selector === 'light'}
                    on:click={() => {
                        ui_theme_store.set('light');
                    }}
                />
                <label for="system">{$_('light_theme')}</label>
            </div>
            <div>
                <input
                    type="radio"
                    id="dark"
                    name="dark"
                    value="dark"
                    checked={theme_selector === 'dark'}
                    on:click={() => {
                        ui_theme_store.set('dark');
                    }}
                />
                <label for="dark">{$_('dark_theme')}</label>
            </div>
        </div>

			<div class="flex flex-row gap-x-2">
				<input
					type="checkbox"
					checked={get(usunits_store)}
					class="accent-seashore"
					on:click={() => {
						usunits_store.update((x) => !x);
						window.localStorage.usunits = get(usunits_store);
					}}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							usunits_store.update((x) => !x);
							window.localStorage.usunits = get(usunits_store);
						}
					}}
				/>
				<p>{$_('useUSunits')}</p>
			</div>
			<div class="flex flex-row gap-x-2">
				<input
					type="checkbox"
					checked={get(show_gtfs_ids_store)}
					class="accent-seashore"
					on:click={() => {
						show_gtfs_ids_store.update((x) => !x);
						window.localStorage.show_gtfs_ids = get(show_gtfs_ids_store);
					}}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							show_gtfs_ids_store.update((x) => !x);
							window.localStorage.show_gtfs_ids = get(show_gtfs_ids_store);
						}
					}}
				/>
				<p>{$_('show_gtfs_ids')}</p>
			</div>

			<div class="flex flex-row gap-x-2">
				<input
					type="checkbox"
					class="accent-seashore"
					checked={show_seconds}

					on:click={(e) => {
						show_seconds_store.set(e.target.checked);
					}}
					on:keydown={(e) => {
						show_seconds_store.set(e.target.checked);
					}}
				/>
				<p>{$_('show_seconds_in_trips')}</p>
			</div>
                        <p><br>{$_('softwarebuilddate')}: {buildDate}</p>
                        <a href="https://github.com/catenarytransit/catenary-frontend/commit/{commitId}">Deployed Commit <u>{commitId.substring(0, 7)}</u></a>
		</div>
