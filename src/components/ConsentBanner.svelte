<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

    	import {
		consentGiven,
	} from '../globalstores';
	import { getLocaleFromNavigator, locale, locales, _ } from 'svelte-i18n';

	let showBanner = false;

	onMount(() => {
		const consent = localStorage.getItem('cookie_consent');
		if (consent === 'true') {
			consentGiven.set(true);
		} else if (consent === 'false') {
			consentGiven.set(false);
		} else {
			showBanner = true;
		}
	});

	function handleConsent(hasConsented: boolean) {
		localStorage.setItem('cookie_consent', String(hasConsented));
		consentGiven.set(hasConsented);
		showBanner = false;
	}
</script>

{#if showBanner}
	<div
		class="fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 md:w-auto max-w-1xl z-50 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-2xl flex flex-col md:flex-row items-center gap-4"
	>
		<p class="text-sm text-gray-800 dark:text-gray-200">
			{$_("cookie_consent_analytics")}
		</p>
		<div class="flex gap-2 flex-shrink-0">
			<button on:click={() => handleConsent(true)}
				 class="px-4 py-2 bg-blue-600 text-white
				  rounded-md hover:bg-blue-700">{$_("accept")}</button>
			<button on:click={() => handleConsent(false)} class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-700"> {$_("decline")} </button>
		</div>
	</div>
{/if}