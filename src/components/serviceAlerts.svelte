<script lang="ts">
	
	import { _ } from 'svelte-i18n'; 
	import  { cause_id_str, effect_id_str } from './alert_id_to_str_key';
export let alerts = {};

$: languagelist = Object.values(alerts).map((alert) => {
	if (alert.header_text) {
		return alert.header_text.translation.map((x) => x.language);
	}
	return [];
}).flat().filter((x, i, a) => a.indexOf(x) == i);
</script>
{#if Object.keys(alerts).length > 0}
				<div class="border-[#F99C24] border leading-snug mb-3 p-2 rounded-md">
					<img src="/icons/service_alert.svg" alt="(i)" class="h-6 w-6 inline mr-2" />
					<span class="text-[#F99C24] font-semibold text-lg align-middle"
						>Service Alert{Object.keys(alerts).length > 1 ? 's' : ''}</span
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
										<span>{url_translation.language}: </span><a href={url_translation.text} class="hover:underline text-sky-500 dark:text-sky-300" target="_blank">{url_translation.text}</a>
									</p>
								{/each}
							{/if}
							
							{#each alert.header_text.translation.filter((x) => languagelist.includes("en-html") ? (x.language != "en") : true) as each_header_translation_obj}
								<p class={`text-sm`}>{each_header_translation_obj.text.replaceAll(/\<(\/)?p\>/g,"").replaceAll(/\<(\/)?b\>/g,"")}</p>
								{#if alert.description_text}
								{#each alert.description_text.translation.filter((x) => languagelist.includes("en-html") ? (x.language != "en") : true).filter((x) => x.language == each_header_translation_obj.language) as description_alert}
								<div class="leading-none">
									{#each description_alert.text.split('\n') as each_desc_line}
										<div class="text-xs pt-0.5">
											{@html each_desc_line.replaceAll(
												'<a ',
												'<a target="_blank" class="text-sky-500 dark:text-sky-300 underline"'
											).replaceAll(/\<(\/)?p\>/g,"").replaceAll(/\<(\/)?b\>/g,"").replaceAll(/(\[)?accessibility icon(\])?/g, "<span class=\"bg-blue-200 dark:bg-gray-500 w-3 h-3 rounded-full inline\"><span class=\"text-sm material-symbols-outlined \">accessible</span></span>")}
										</div>
									{/each}
									
								</div>
							{/each}
								{/if}
							{/each}
						</div>
					{/each}
				</div>
			{/if}