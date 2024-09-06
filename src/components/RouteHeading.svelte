<script lang="ts">
	import { fixRouteName, fixRouteNameLong } from './agencyspecific';
	import { lightenColour } from './lightenDarkColour';
	import {
		find_schedule_pdf,
		find_schedule_pdf_initial,
		has_schedule_pdf,
		schedule_pdf_needs_hydration
	} from './pdf_schedules';

	export let color: string;
	export let text_color: string;

	export let short_name: string | null;
	export let long_name: string | null;
	export let url: string | null = null;

	export let run_number: string | null = null;
	export let icon: string | null = null;

	export let route_id: string;
	export let chateau_id: string;

	export let text: string;

	export let compact: boolean = false;
	export let darkMode: boolean;

	export let disable_pdf: boolean = false;

	let pdf_url: string | undefined;

	if (has_schedule_pdf(chateau_id) && !disable_pdf) {
		pdf_url = find_schedule_pdf_initial(chateau_id, route_id);
	}

	if (schedule_pdf_needs_hydration(chateau_id) && !disable_pdf) {
		find_schedule_pdf(chateau_id, route_id)
			.then((answer) => (pdf_url = answer))
			.catch((pdferr) => console.error(pdferr));
	}
</script>

{#if !compact}
	<h2 class="text-xl mt-2" style={`color: ${darkMode ? lightenColour(color) : color}`}>
		{#if run_number}
			<span
				style={`background-color: ${color}; color: ${text_color};`}
				class="font-bold text-md px-1 py-0.5 mr-1 rounded-md w-min">{run_number}</span
			>
		{/if}

		{#if short_name}
			<span class="font-bold">{fixRouteName(chateau_id, short_name, route_id)}</span>
		{/if}

		{#if long_name}
			<span class={`${short_name ? 'font-normal ml-1' : 'font-bold'}`}
				>{fixRouteNameLong(chateau_id, long_name, route_id)}</span
			>
		{/if}

        {#if icon}
            <span class="material-icons-outlined text-2xl align-middle">{icon}</span>
        {/if}
	</h2>

	<h2 class="text-lg font-medium my-1">{text}</h2>

	<div class="flex flex-row gap-x-2">
		{#if pdf_url != null}
			<a target="_blank" href={pdf_url}>
				<div
					class="px-2 py-0.5 my-1 border-seashore text-seashore flex flex-row align-middle justify-center rounded-xl border-2 hover:text-white hover:bg-seashore hover:transition-colors"
				>
					<span class="material-symbols-outlined font-medium text-2xl align-middle">
						attachment
					</span>
					<span class="font-medium text-base md:text-lg pl-2">PDF</span>
				</div>
			</a>
		{/if}
		{#if url != null}
			<a target="_blank" href={url}>
				<div
					class="px-2 py-0.5 my-1 border-seashore text-seashore flex flex-row align-middle justify-center rounded-xl border-2 hover:text-white hover:bg-seashore hover:transition-colors"
				>
					<span class="material-symbols-outlined font-medium text-2xl align-middle"> globe </span>
					<span class="font-medium text-base md:text-lg pl-2">URL</span>
				</div>
			</a>
		{/if}
	</div>
{/if}
