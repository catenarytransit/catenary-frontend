<script lang="ts">
	import TimeDiff from './TimeDiff.svelte';

	import DelayDiff from './DelayDiff.svelte';
	import { _ } from 'svelte-i18n';
	import Clock from './Clock.svelte';

	export let event: any;
    export let data_from_server:any;
    export let current_time:number;
    export let show_seconds:boolean;

    $: shared_rt_time = event.rt_departure_time || event.rt_arrival_time;

    $: shared_scheduled_time =
		event.scheduled_departure_time_unix_seconds ||
		event.scheduled_arrival_time_unix_seconds;
</script>
<div class="flex flex-row">
									{$_('departure')}:
									<TimeDiff
										large={false}
										show_brackets={false}
										show_seconds={false}
										diff={(event.realtime_departure || event.scheduled_departure) -
											current_time / 1000}
									/>

									<div class={`ml-auto`}>
										<Clock
											timezone={data_from_server.primary.timezone}
											time_seconds={event.realtime_departure || event.scheduled_departure}
											{show_seconds}
										/>
									</div>
								</div>