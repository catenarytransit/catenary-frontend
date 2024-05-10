<script lang="ts">
	export let scheduled: number;
	export let actual: number | null;

	export let timezone: string | null = null;

	function timesEqualToMinute(time1: number, time2: number) {
		let date1 = new Date(time1 * 1000);
		let date2 = new Date(time2 * 1000);

		return date1.getMinutes() == date2.getMinutes() && date1.getHours() == date2.getHours();
	}
</script>

<div class="ml-auto text-sm">
	<div class="text-sm">
		{#if scheduled}
			<span>
				<span
					class={`${actual ? (timesEqualToMinute(actual, scheduled) ? 'text-seashore font-semibold' : 'text-slate-800 dark:text-gray-600 line-through') : ''}`}
					>{new Date(scheduled * 1000)
						.toLocaleTimeString('en-UK', {
							timeZone: timezone || undefined
						})
						.split(':')
						.slice(0, 2)
						.join(':')}</span
				>
			</span>
			{#if actual && !timesEqualToMinute(actual, scheduled)}
				<span class="ml-1 text-seashore font-semibold">
					{new Date(actual * 1000).toLocaleTimeString('en-UK', {
						timeZone: timezone || undefined
					}).split(':')
						.slice(0, 2)
						.join(':')}
				</span>
			{/if}
		{/if}
	</div>
</div>
