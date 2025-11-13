<script lang="ts">
	import { onMount } from 'svelte';
	import { native_lands_db } from '../data/native_lands';
	import type { NativeLand, NativeLink } from '../data/native_lands';
	import { locale } from 'svelte-i18n';
	export let chateau: string;

	let native_land: NativeLand | null = null;

	let saved_locale = 'en';

	locale.subscribe((value) => {
		if (value) {
			saved_locale = value;

			recompute_text();
		}
	});

	let title_to_use: string | null = null;
	let agency_statement: string | null = null;

	function recompute_text() {
		if (native_land) {
			let lang_code_title = native_land.default_language_code;

			if (native_land.title_translated[saved_locale]) {
				lang_code_title = saved_locale;
			}

			title_to_use = native_land.title_translated[lang_code_title];

			let agency_statement_lang_code = native_land.default_language_code;

			if (native_land.agency_statement) {
				if (native_land.agency_statement[saved_locale]) {
					agency_statement_lang_code = saved_locale;
				}

				agency_statement = native_land.agency_statement[agency_statement_lang_code];
			}
		}
	}

	onMount(() => {
		native_land = native_lands_db[chateau];

		recompute_text();
	});
</script>

{#if native_land}
	<div class="mt-1 px-2 py-2 mb-1">
		<h2 class="text-base md:text-lg font-bold">{title_to_use}</h2>

		{#if agency_statement}
			<p
				class="leading-none text-sm lg:text-base md:leading-tight text-gray-700 italic dark:text-gray-400"
			>
				{agency_statement}
			</p>
		{/if}

		<ul class="list-disc">
			{#each native_land.links as { title, url }}
				<li>
					<a
						href={url}
						target="_blank"
						rel="noopener"
						class="underline text-blue-700 dark:text-blue-400">{title}</a
					>
				</li>
			{/each}
		</ul>
	</div>
{/if}
