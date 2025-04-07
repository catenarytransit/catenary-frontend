<script lang="ts">
	import { _, locale } from 'svelte-i18n';
	import { cause_id_str, effect_id_str } from './alert_id_to_str_key';
	import TimeDiff from './TimeDiff.svelte';
	export let alerts = {};
	export let default_tz: string | null = null;

	//get locale from the store

	let locale_code: string = 'en-CA';

	$: locale.subscribe((value) => {
		if (value) {
			if (locale_code.startsWith('en')) {
				locale_code = 'en-CA';
			} else {
				locale_code = value;
			}
		}
	});

	$: languagelist = Object.values(alerts)
		.map((alert) => {
			let list: any[] = [];

			if (alert.header_text != null) {
				list = list.concat(alert.header_text.translation.map((x) => x.language));
			}

			if (alert.description_text != null) {
				list = list.concat(alert.description_text.translation.map((x) => x.language));
			}

			return list;
		})
		.flat()
		.filter((x, i, a) => a.indexOf(x) == i);
</script>

{#if Object.keys(alerts).length > 0}
	<div class="border-[#F99C24] border leading-snug mb-3 p-2 rounded-md">
		<img src="/icons/service_alert.svg" alt="(i)" class="h-6 w-6 inline mr-2" />
		<span class="text-[#F99C24] font-semibold text-lg align-middle"
			>{$_('service_alerts', {
				values: {
					n: Object.keys(alerts).length
				}
			})}</span
		>
		<div class="py-0.5"></div>
		{#each Object.values(alerts) as alert}
			<div class="pt-1">
				<hr class="border-[#F99C24] border-0.5 rounded-xl" />
				<p class="text-base font-medium text-[#F99C24] pt-1">
					<span class="">{$_(cause_id_str(alert.cause))}</span>
					<span> // </span>
					<span>{$_(effect_id_str(alert.effect))}</span>
				</p>

				{#if alert.url}
					{#each alert.url.translation as url_translation}
						<p class="text-sm">
							<span>{url_translation.language != null ? url_translation.language : ''}: </span><a
								href={url_translation.text}
								class="hover:underline text-sky-500 dark:text-sky-300"
								target="_blank">{url_translation.text}</a
							>
						</p>
					{/each}
				{/if}

				{#each languagelist.filter( (x) => (languagelist.includes('en-html') ? x.language != 'en' : true) ) as language}
					{#if alert.header_text != null}
						{#each alert.header_text.translation.filter((x) => x.language == language) as each_header_translation_obj}
							<p class={`text-sm`}>
								{each_header_translation_obj.text
									.replaceAll(/\<(\/)?p\>/g, '')
									.replaceAll(/\<(\/)?b\>/g, '')}
							</p>
						{/each}
					{/if}

					{#if alert.description_text != null}
						{#each alert.description_text.translation.filter((x) => x.language == language) as description_alert}
							<div class="leading-none">
								{#each description_alert.text.split('\n') as each_desc_line}
									<div class="text-xs pt-0.5">
										{@html each_desc_line
											.replaceAll(
												'<a ',
												'<a target="_blank" class="text-sky-500 dark:text-sky-300 underline"'
											)
											.replaceAll(/\<(\/)?p\>/g, '')
											.replaceAll(/\<(\/)?b\>/g, '')
											.replaceAll('https://rt.scmetro.org ', 'Catenary Maps ')
											.replaceAll(
												/(\[)?accessibility icon(\])?/g,
												'<span class="bg-blue-200 dark:bg-gray-500 w-3 h-3 rounded-full inline"><span class="text-xs material-symbols-outlined ">accessible</span></span>'
											)}
									</div>
								{/each}
							</div>
						{/each}
					{/if}
				{/each}{#if alert.active_period.length > 0}
					{#each alert.active_period as active_period}
						{#if active_period.start != null}
							<p class="text-xs">
								{$_('starting_time')}:
								{#if default_tz}
									{new Date(active_period.start * 1000).toLocaleString(locale_code, {
										timeZone: default_tz,
										hour12: false
									})}
								{:else}
									{new Date(active_period.start * 1000).toLocaleString(locale_code, {
										hour12: false
									})}
								{/if}

								<TimeDiff
									diff={active_period.start - new Date().getTime() / 1000}
									show_seconds={false}
									show_brackets={true}
									show_plus={true}
									show_days={true}
								/>
							</p>
						{/if}

						{#if active_period.end != null}
							<p class="text-xs">
								{$_('ending_time')}:
								{#if default_tz}
									{new Date(active_period.end * 1000).toLocaleString(locale_code, {
										timeZone: default_tz,
										hour12: false
									})}
								{:else}
									{new Date(active_period.end * 1000).toLocaleString(locale_code, {
										hour12: false
									})}
								{/if}

								<TimeDiff
									diff={active_period.end - new Date().getTime() / 1000}
									show_seconds={false}
									show_brackets={true}
									show_plus={true}
									show_days={true}
								/>
							</p>
						{/if}
					{/each}
				{/if}
			</div>
		{/each}
	</div>
{/if}
