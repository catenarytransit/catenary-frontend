<script lang="ts">
	import { lightenColour } from './lightenDarkColour';
	import {
		MapSelectionScreen,
		StackInterface,
		MapSelectionOption,
		SingleTrip,
		VehicleMapSelector,
		RouteStack,
		StopStack,
		RouteMapSelector,
		VehicleSelectedStack
	} from '../components/stackenum';
	import HomeButton from './SidebarParts/home_button.svelte';
	import { SettingsStack } from '../components/stackenum';
	import { writable } from 'svelte/store';
	import { data_stack_store, usunits_store } from '../globalstores';
	import { locale, locales } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
	import { _ } from 'svelte-i18n';
	import SingleTripInfo from './SingleTripInfo.svelte';
	export let latest_item_on_stack: StackInterface | null;
	export let darkMode: boolean;

	let locales_options: Record<string, string> = {
		en: 'English',
		fr: 'Français',
		es: 'Español',
		de: 'Deutsch',
		ko: '한국어',
		'zh-CH': '简体中文',
		'zh-TW': '繁體中文'
	};

	let locales_options_lookup: Record<string, string> = {
		en: 'English',
		fr: 'Français',
		es: 'Español',
		de: 'Deutsch',
		ko: '한국어',
		zh: '中文',
		'zh-CH': '简体中文',
		'zh-TW': '繁體中文'
	};

	function locale_code_to_name(locale: string | null | undefined) {
		if (locale == null || locale == undefined) {
			return '--';
		} else {
			let temp = locales_options_lookup[locale];
			if (temp == null || temp == undefined) {
				return locale;
			} else {
				return temp;
			}
		}
	}
</script>

{#key latest_item_on_stack}
	{#if latest_item_on_stack != null}
		{#if latest_item_on_stack.data instanceof MapSelectionScreen}
			<div class="pl-4 sm:pl-2 lg:pl-4 py-2 flex flex-col h-full">
				<div class="flex flex-row gap-x-2">
					<HomeButton />
				</div>
				<h1 class="text-lg md:text-2xl font-semibold leading-tight">
					{latest_item_on_stack.data.arrayofoptions.length}
					{$_('itemsselected')}
				</h1>
				{#if !isLoading}
					<p class="text-sm md:text-base leading-tight">{$_('clickonanyitemfromthislist')}</p>
				{/if}
				<div class="flex-grow-0 h-full">
					<div class=" catenary-scroll overflow-y-auto pr-4 h-full pb-16">
						{#if latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof VehicleMapSelector).length > 0}
							<h3 class="text-base sm:text-lg">{$_('vehicles')}</h3>
							<div class="flex flex-col gap-y-1 md:gap-y-2">
								{#each latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof VehicleMapSelector) as option}
									<div
										on:click={() => {
											data_stack_store.update((data_stack) => {
												if (option.data.trip_id) {
													data_stack.push(
														new StackInterface(
															new SingleTrip(
																option.data.chateau_id,
																option.data.trip_id,
																option.data.route_id,
																option.data.start_time,
																option.data.start_date,
																option.data.vehicle_id
															)
														)
													);

													
												} else {
													data_stack.push(
														new StackInterface(
															new VehicleSelectedStack(
																option.data.chateau_id,
																option.data.vehicle_id,
																option.data.gtfs_id
															)
														)
													);
												}

												return data_stack;
											});
										}}
										on:keydown={() => {
											data_stack_store.update((data_stack) => {
												if (option.data.trip_id) {
													data_stack.push(
														new StackInterface(
															new SingleTrip(
																option.data.chateau_id,
																option.data.trip_id,
																option.data.route_id,
																option.data.start_time,
																option.data.start_date,
																option.data.vehicle_id
															)
														)
													);
												} else {
													data_stack.push(
														new StackInterface(
															new VehicleSelectedStack(
																option.data.chateau_id,
																option.data.vehicle_id,
																option.data.gtfs_id
															)
														)
													);
												}

												return data_stack;
											});
										}}
										role="menuitem"
										tabindex="0"
										class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-50 dark:bg-slate-800 shadow-md shadow-gray-500 dark:shadow-slate-700 text-sm md:text-base leading-snug"
									>
										{#if option.data.triplabel}
											{#if option.data.trip_short_name}
												<span
													style={`background-color: ${option.data.colour}; color: ${option.data.text_colour};`}
													class="font-bold font-mono px-1 py-0.5 rounded-sm"
													>{option.data.trip_short_name}</span
												>
											{/if}
											{#if option.data.route_short_name}
												<span
													style={`color: ${darkMode ? lightenColour(option.data.colour) : option.data.colour}`}
													class="font-semibold"
													>{option.data.route_short_name.replace(
														'Counterclockwise',
														'Anticlockwise'
													)}</span
												>
											{/if}
											{#if option.data.route_long_name}
												<span
													style={`color: ${darkMode ? lightenColour(option.data.colour) : option.data.colour}`}
													>{option.data.route_long_name.replace(
														'Counterclockwise',
														'Anticlockwise'
													)}</span
												>
											{/if}
											{#if option.data.chateau_id == 'san-diego-mts' && option.data.route_type == 0}
												<span class="">
													#{option.data.vehicle_id}
												</span>
											{/if}
										{:else}
											<p>No Trip</p>
										{/if}

										{#if option.data.headsign}
											<p>{option.data.headsign}</p>
										{/if}
										{#if option.data.vehicle_id && !(option.data.chateau_id == 'san-diego-mts' && option.data.route_type == 0)}
											<p>{$_('vehicle')} {option.data.vehicle_id}</p>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						{#if latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof RouteMapSelector).length > 0}
							<h3 class="text-base sm:text-lg">{$_('routes')}</h3>
							<p>Selecting routes doesn't do anything yet!</p>
							<div class="flex flex-col gap-y-1 md:gap-y-2">
								{#each latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof RouteMapSelector) as option}
									<div
										class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-50 dark:bg-slate-800 shadow-md shadow-gray-500 dark:shadow-slate-700 text-sm md:text-base"
									>
										<p>{option.data.chateau_id}</p>
										{#if option.data.name}
											<span
												style={`color: ${darkMode ? lightenColour(option.data.colour) : option.data.colour}`}
												>{option.data.name}</span
											>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
						<br />
						<br />
						<br />
					</div>
				</div>
			</div>
		{/if}
		{#if latest_item_on_stack.data instanceof SettingsStack}
			<div class="px-4 sm:px-2 lg:px-4 py-2 flex flex-col h-full">
				<div class="flex flex-row gap-x-2">
					<HomeButton />
				</div>
				<h1 class="text-3xl">{$_('settings')}</h1>
				<br />
				<div class="flex flex-row gap-x-3 w-full">
					<p class="flex-grow-0 min-w-1/3">{$_('language')}</p>
					<select
						bind:value={$locale}
						class="text-black bg-white dark:bg-slate-900 text-white flex-grow border border-slate-500"
					>
						{#each $locales as locale}
							<option value={locale} class="text-black bg-white dark:bg-slate-900 text-white"
								>{locale_code_to_name(locale)}</option
							>
						{/each}
					</select>
				</div>
				<div class="flex flex-row gap-x-2">
					<input
						type="checkbox"
						bind:checked={$usunits_store}
						class="accent-sky-500"
						on:click={() => {
							usunits_store.update((x) => !x);
						}}
						on:keydown={(e) => {
							if (e.key === 'Enter') {
								usunits_store.update((x) => !x);
							}
						}}
					/>
					<p>{$_('useUSunits')}</p>
				</div>
			</div>
		{/if}
		{#if latest_item_on_stack.data instanceof VehicleSelectedStack}
		<div class="px-4 sm:px-2 lg:px-4 py-2 flex flex-col h-full">
			<div class="flex flex-row gap-x-2">
				<HomeButton />
			</div>
			<p>Vehicle selected {latest_item_on_stack.data.chateau_id} {latest_item_on_stack.data.vehicle_id} {latest_item_on_stack.data.gtfs_id}</p>
			</div>
		{/if}
		{#if latest_item_on_stack.data instanceof SingleTrip}
		<div class=" flex flex-col h-full">
			<div class="flex flex-row gap-x-2 px-4 sm:px-2 lg:px-4 pt-2">
				<HomeButton />
			</div>
			
			<SingleTripInfo
				trip_selected={latest_item_on_stack.data}
				/>
			</div>
		{/if}
	{:else if false}
		<p>Loading home page</p>
	{:else}
		<div class="px-4 sm:px-2 lg:px-4 py-2">
			<div class="flex flex-row gap-x-2">
				<button
					class="h-8 w-8 text-black dark:text-white bg-sky-400 dark:bg-sky-700 rounded-full flex flex-col shadow-md"
					on:click={() => {
						window.location.reload();
					}}
					aria-label="Refresh"
					><div class="m-auto block">
						<span class="material-symbols-outlined block"> refresh </span>
					</div></button
				>
				<div class="ml-auto">
					<button
						class="h-8 w-8 text-black dark:text-white bg-sky-400 dark:bg-sky-700 rounded-full flex flex-col shadow-md"
						on:click={() => {
							data_stack_store.update((x) => {
								x.push(new StackInterface(new SettingsStack()));
								return x;
							});
						}}
						aria-label="Refresh"
						><div class="m-auto block">
							<span class="material-symbols-outlined block"> settings </span>
						</div></button
					>
				</div>
			</div>
			<p class="text-sm md:text-base">{$_('clickonanyvehicleorroutegetstarted')}</p>
			<p class="text-xs md:text-sm">Catenary Maps {$_('softwareversion')} 2024-05-08 04:16Z</p>

			<div></div>

			<h2 class="text-base md:text-lg">{$_('nearbydepartures')}</h2>
			<p>{$_('comingsoon')}</p>
		</div>
	{/if}
{/key}
