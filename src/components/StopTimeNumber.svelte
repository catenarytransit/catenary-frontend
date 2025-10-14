<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TimeDiff from './TimeDiff.svelte';
	import DelayDiff from './DelayDiff.svelte';
	import BullseyeArrow from './svg_icons/bullseye_arrow.svelte';
	import Clock from './Clock.svelte';
	import Realtimeicon from './svg_icons/realtimeicon.svelte';
	import { onMount } from 'svelte';

	export let show_seconds: boolean = false;
	export let trip_data: any;
	export let stoptime: any;
	export let current_time: number;

	$: current_time_secs = Math.floor(current_time / 1000);

	let show_both_departure_and_arrival = calculate_show_both_departure_and_arrival();

	let debug_mode = false;

	$: shared_rt_time = stoptime.rt_departure_time || stoptime.rt_arrival_time;

	$: shared_scheduled_time =
		stoptime.scheduled_departure_time_unix_seconds ||
		stoptime.scheduled_arrival_time_unix_seconds ||
		stoptime.interpolated_stoptime_unix_seconds;

	onMount(() => {
		show_both_departure_and_arrival = calculate_show_both_departure_and_arrival();
	});

	function calculate_show_both_departure_and_arrival(): boolean {
		//if has 2 different scheduled timestamps

		if (
			stoptime.scheduled_departure_time_unix_seconds &&
			stoptime.scheduled_arrival_time_unix_seconds
		) {
			if (
				stoptime.scheduled_departure_time_unix_seconds !=
				stoptime.scheduled_arrival_time_unix_seconds
			) {
				return true;
			}
		}

		if (stoptime.rt_departure_time && stoptime.rt_arrival_time) {
			if (stoptime.rt_departure_time != stoptime.rt_arrival_time) {
				return true;
			}
		}

		return false;
	}
</script>

{#if shared_scheduled_time || shared_rt_time}
	{#if show_both_departure_and_arrival}
		<!--ARRIVAL SECTION-->

		<div class="flex flex-row items-center space-x-1">
			<TimeDiff
				diff={(stoptime.rt_arrival_time || stoptime.scheduled_arrival_time_unix_seconds) -
					current_time_secs}
				{show_seconds}
				show_brackets={false}
			/>
			{#if stoptime.rt_arrival_time}
				{#if stoptime.scheduled_arrival_time_unix_seconds || stoptime.interpolated_stoptime_unix_seconds}
					<DelayDiff
						diff={stoptime.rt_arrival_time -
							(stoptime.scheduled_arrival_time_unix_seconds ||
								stoptime.interpolated_stoptime_unix_seconds)}
						{show_seconds}
					/>
				{/if}
			{/if}

			<div class="ml-auto text-sm">
				<div class="text-sm text-right">
					<p class="text-right">
						<span
							class="text-xs align-middle mr-1 inline-block -translate-y-0.5 text-slate-600 dark:text-gray-400"
						>
							{$_('arrival')}</span
						>

						{#if stoptime.rt_arrival_time}
							{#if stoptime.rt_arrival_time == stoptime.scheduled_arrival_time_unix_seconds}
								<BullseyeArrow class_name="w-4 h-4 inline-block align-middle text-[#58A738]" />
							{/if}
							{#if stoptime.rt_arrival_time != stoptime.scheduled_arrival_time_unix_seconds}
								{#if stoptime.scheduled_arrival_time_unix_seconds || stoptime.interpolated_stoptime_unix_seconds}
									<span class="text-slate-600 dark:text-gray-400 line-through">
										<Clock
											timezone={stoptime.timezone || trip_data.tz}
											time_seconds={stoptime.scheduled_arrival_time_unix_seconds ||
												stoptime.interpolated_stoptime_unix_seconds}
											{show_seconds}
										/>
									</span>
								{/if}
							{/if}
							<span class="text-seashore dark:text-seashoredark font-medium">
								<Clock
									timezone={stoptime.timezone || trip_data.tz}
									time_seconds={stoptime.rt_arrival_time}
									{show_seconds}
								/>
							</span>
						{:else}
							<Clock
								timezone={stoptime.timezone || trip_data.tz}
								time_seconds={stoptime.scheduled_arrival_time_unix_seconds ||
									stoptime.interpolated_stoptime_unix_seconds}
								{show_seconds}
							/>
						{/if}
					</p>
				</div>
			</div>
		</div>

		<!--DEPARTURE SECTION-->

		<div class="flex flex-row items-center space-x-1">
			<TimeDiff
				diff={(stoptime.rt_departure_time || stoptime.scheduled_departure_time_unix_seconds) -
					current_time_secs}
				{show_seconds}
				show_brackets={false}
			/>
			{#if stoptime.rt_departure_time}
				{#if stoptime.scheduled_departure_time_unix_seconds || stoptime.interpolated_stoptime_unix_seconds}
					<DelayDiff
						diff={stoptime.rt_departure_time -
							(stoptime.scheduled_departure_time_unix_seconds ||
								stoptime.interpolated_stoptime_unix_seconds)}
						{show_seconds}
					/>
				{/if}
			{/if}

			<div class="ml-auto text-sm">
				<div class="text-sm text-right">
					<p class="text-right">
						<span
							class="text-xs align-middle mr-1 inline-block -translate-y-0.5 text-slate-600 dark:text-gray-400"
						>
							{$_('departure')}</span
						>

						{#if stoptime.rt_departure_time}
							{#if stoptime.rt_departure_time == stoptime.scheduled_departure_time_unix_seconds}
								<BullseyeArrow class_name="w-4 h-4 inline-block align-middle text-[#58A738]" />
							{/if}
							{#if stoptime.rt_departure_time != stoptime.scheduled_departure_time_unix_seconds}
								<span class="text-slate-600 dark:text-gray-400 line-through">
									{#if stoptime.scheduled_departure_time_unix_seconds || stoptime.interpolated_stoptime_unix_seconds}
										<Clock
											timezone={stoptime.timezone || trip_data.tz}
											time_seconds={stoptime.scheduled_departure_time_unix_seconds ||
												stoptime.interpolated_stoptime_unix_seconds}
											{show_seconds}
										/>
									{/if}
								</span>
							{/if}
							<span class="text-seashore dark:text-seashoredark font-medium">
								<Clock
									timezone={stoptime.timezone || trip_data.tz}
									time_seconds={stoptime.rt_departure_time}
									{show_seconds}
								/>
							</span>
						{:else}
							<Clock
								timezone={stoptime.timezone || trip_data.tz}
								time_seconds={stoptime.scheduled_departure_time_unix_seconds ||
									stoptime.interpolated_stoptime_unix_seconds}
								{show_seconds}
							/>
						{/if}
					</p>
				</div>
			</div>
		</div>
	{:else}
		<!--UNIFIED TIME-->

		<div class="flex flex-row items-center space-x-1">
			{#if shared_rt_time || shared_scheduled_time}
				<TimeDiff
					diff={(shared_rt_time || shared_scheduled_time) - current_time_secs}
					{show_seconds}
					show_brackets={false}
				/>
			{/if}
			{#if shared_rt_time && shared_scheduled_time}
				<DelayDiff diff={shared_rt_time - shared_scheduled_time} {show_seconds} />
			{/if}
			<div class="ml-auto text-sm">
				<div class="text-sm text-right">
					<p class="text-right">
						<span
							class="text-xs align-middle mr-1 inline-block -translate-y-0.5 text-slate-600 dark:text-gray-400"
						></span>
						{#if shared_rt_time}
							{#if shared_rt_time == shared_scheduled_time}
								<BullseyeArrow class_name="w-4 h-4 inline-block text-[#58A738]" />
							{/if}
							{#if shared_rt_time != shared_scheduled_time}{/if}
							{#if shared_scheduled_time}
								{#if shared_rt_time != shared_scheduled_time}
									<span
										class={`${(shared_rt_time != shared_scheduled_time) == true ? 'text-slate-600 dark:text-gray-400 line-through' : ''}`}
									>
										<Clock
											timezone={stoptime.timezone || trip_data.tz}
											time_seconds={shared_scheduled_time}
											{show_seconds}
										/>
									</span>
								{/if}
							{/if}
							<span class="text-seashore dark:text-seashoredark font-medium">
								<Clock
									timezone={stoptime.timezone || trip_data.tz}
									time_seconds={shared_rt_time}
									{show_seconds}
								/>
							</span>
						{:else if shared_scheduled_time}
							<Clock
								timezone={stoptime.timezone || trip_data.tz}
								time_seconds={shared_scheduled_time}
								{show_seconds}
							/>
						{/if}
					</p>
				</div>
			</div>
		</div>
	{/if}
{/if}

{#if debug_mode}<p>
		<span class="text-sm">shared time rt:{shared_rt_time} | sched: {shared_scheduled_time}</span>
	</p>{/if}
