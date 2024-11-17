<script lang="ts">
	
	import { _ } from 'svelte-i18n'; 
	import  { cause_id_str, effect_id_str } from './alert_id_to_str_key';
export let alerts = {};
</script>

{#if Object.keys(alerts).length > 0}
				<div class="border-[#F99C24] border-2 leading-snug mb-3 p-2 rounded-md">
					<img src="/icons/service_alert.svg" alt="(i)" class="h-6 w-6 inline mr-1" />
					<span class="text-[#F99C24] font-medium"
						>Service Alert{Object.keys(alerts).length > 1 ? 's' : ''}</span
					>
					{#each Object.values(alerts) as alert}
						<div class="pt-1">
							<p>
								<span>{$_(cause_id_str(alert.cause))}</span>
								<span> | </span>
								<span>{$_(effect_id_str(alert.effect))}</span>
								
							</p>
							{#each alert.header_text.translation as each_header_translation_obj}
								<p class="text-sm font-bold">{each_header_translation_obj.text}</p>
								{#each alert.description_text.translation.filter((x) => x.language == each_header_translation_obj.language) as description_alert}
									<div class="leading-none">
										{#each description_alert.text.split('\n') as each_desc_line}
											<p class="text-sm">
												{@html each_desc_line.replaceAll(
													'<a ',
													'<a target="_blank" class="text-sky-500 dark:text-sky-300 underline"'
												)}
											</p>
										{/each}
									</div>
								{/each}
							{/each}
						</div>
					{/each}
				</div>
			{/if}