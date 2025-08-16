<script lang="ts">
	import TimeDiff from './TimeDiff.svelte';

	import BullseyeArrow from './svg_icons/bullseye_arrow.svelte';
	import DelayDiff from './DelayDiff.svelte';
	import { _ } from 'svelte-i18n';
	import Clock from './Clock.svelte';

	export let event: any;
	export let data_from_server: any;
	export let current_time: number;
	export let show_seconds: boolean;

	$: shared_rt_time = event.realtime_departure;

	$: shared_scheduled_time =
		event.scheduled_departure;
</script>

<div class={`flex flex-row`}>
	{event.last_stop ? $_('arrival') : $_('departure')}:
	<TimeDiff
		large={false}
		show_brackets={false}
		show_seconds={show_seconds}
		diff={(shared_rt_time || shared_scheduled_time) - current_time / 1000}
	/> 

    <span class="ml-1">
        {#if shared_rt_time}
			<DelayDiff diff={shared_rt_time - shared_scheduled_time} {show_seconds} />
		{/if}
    </span>

	{#if shared_rt_time}
		<div class={`ml-auto`}>
			{#if shared_rt_time == shared_scheduled_time}
				<BullseyeArrow class_name={`w-4 h-4 inline-block align-middle text-[#58A738]`} />
			{/if}
			{#if shared_rt_time != shared_scheduled_time}
				<span class="text-slate-600 dark:text-gray-400 line-through">
					<Clock
						timezone={data_from_server.primary.timezone}
						time_seconds={shared_scheduled_time}
						{show_seconds}
					/>
				</span>
			{/if}
			<span class={"text-seashore dark:text-seashoredark font-medium" + `${ shared_rt_time < (current_time / 1000) ? 'opacity-70' : '' }`}>
				<Clock
					timezone={data_from_server.primary.timezone}
					time_seconds={shared_rt_time}
					{show_seconds}
				/>
			</span>
		</div>
	{:else}
		<div class={`ml-auto ${ shared_scheduled_time < (current_time / 1000) ? 'opacity-70' : '' }`}>
			<Clock
				timezone={data_from_server.primary.timezone}
				time_seconds={shared_scheduled_time}
				{show_seconds}
			/>
		</div>
	{/if}
</div>
