<script lang="ts">
	// @ts-nocheck
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
	import BackButton from './SidebarParts/back_button.svelte';
	import { SettingsStack } from '../components/stackenum';
	import NearbyDepartures from './NearbyDepartures.svelte';
	import { writable } from 'svelte/store';
	import {get} from 'svelte/store';
	import { data_stack_store, usunits_store, dark_mode_store, show_gtfs_ids_store } from '../globalstores';
	import { getLocaleFromNavigator, locale, locales } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
	import { _ } from 'svelte-i18n';
	import SingleTripInfo from './SingleTripInfo.svelte';
	import {
		fixHeadsignIcon,
		fixRouteName,
		fixRouteNameLong,
		fixRunNumber,
		fixHeadsignText,
		fixRouteIcon
	} from './agencyspecific';
	import RouteScreen from './RouteScreen.svelte';
	import RouteIcon from './RouteIcon.svelte';
	import { getLocaleStorageOrNav } from '../i18n';
	import TidbitSidebarCard from './SidebarParts/tidbits.svelte';
	export let latest_item_on_stack: StackInterface | null;
	export let darkMode: boolean;
	let this_locale: string | undefined | null;

	locale.subscribe((newval) => {
		this_locale = newval;
	});

        let show_gtfs_ids = get(show_gtfs_ids_store);

        show_gtfs_ids_store.subscribe((value) => {
          show_gtfs_ids = value;
        });

	let locales_options: Record<string, string> = {
		en: 'English',
		fr: 'Français',
		es: 'Español',
		de: 'Deutsch',
		ko: '한국어',
		'zh-CH': '简体中文',
		'zh-TW': '繁體中文',
		nl: 'Nederlands'
	};

	let locales_options_lookup: Record<string, string> = {
		en: 'English',
		fr: 'Français',
		es: 'Español',
		de: 'Deutsch',
		ko: '한국어',
		zh: '中文',
		'zh-CH': '简体中文',
		'zh-TW': '繁體中文',
		nl: 'Nederlands'
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

	export let usunits: boolean;

	let simpleRouteMode: boolean = true;

	if (typeof window !== 'undefined') {
		if (window.localStorage.getItem('simpleRouteMode') == 'true') {
			simpleRouteMode = true;
		} else {
			simpleRouteMode = false;
		}
	}
</script>

{#if latest_item_on_stack != null}
	{#if latest_item_on_stack.data instanceof MapSelectionScreen}
		<HomeButton />
		<div class="px-4 flex flex-col h-full w-full">
			<h1 class="text-lg md:text-2xl font-semibold leading-tight">
				{latest_item_on_stack.data.arrayofoptions.length}
				{$_('itemsselected')}
			</h1>
			<div class="flex-grow-0 h-full select-text">
				<div class=" catenary-scroll overflow-y-auto pr-2 h-full pb-16">
					{#if latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof VehicleMapSelector).length > 0}
						<h3 class="text-xl my-1">{$_('vehicles')}</h3>
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
															option.data.vehicle_id,
															option.data.route_type
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
															option.data.vehicle_id,
															option.data.route_type
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
									class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-100 dark:bg-darksky hover:bg-blue-100 hover:dark:bg-hover text-sm md:text-base leading-snug rounded-lg"
								>
								{
									#if show_gtfs_ids_store
								}
								<p>
									<span class="font-mono text-xs dark:text-gray-400 text-gray-500"
								>{option.data.chateau_id}</span
							>  
								{
									#if option.data.route_id
								
								}
								<span class="font-mono text-xs dark:text-gray-400 text-gray-500 ml-1 font-semibold"
								>{option.data.route_id}</span
							>
								
								
							{/if}</p>
								{/if}
									{#if option.data.trip_id}
										{#if option.data.route_long_name || option.data.route_short_name}
											<span
												class="text-md"
												style={`color: ${darkMode ? lightenColour(option.data.colour) : option.data.colour}`}
											>
												
												{#if option.data.route_long_name && option.data.route_short_name && !option.data.route_long_name.includes(option.data.route_short_name)}
													<span class="font-bold"
														>{fixRouteName(
															option.data.chateau_id,
															option.data.route_short_name,
															option.data.route_id
														)}</span
													>
													<span class="font-normal ml-1"
														>{fixRouteNameLong(
															option.data.chateau_id,
															option.data.route_long_name,
															option.data.route_id
														)}</span
													>
												{:else}
													<span class="font-semibold"
														>{option.data.route_long_name
															? fixRouteNameLong(
																	option.data.chateau_id,
																	option.data.route_long_name,
																	option.data.route_id
																)
															: fixRouteName(
																	option.data.chateau_id,
																	option.data.route_short_name,
																	option.data.route_id
																)}</span
													>
												{/if}
											</span>
										{/if}
									{:else}
										<p>No Trip</p>
									{/if}

									<p class="text-sm lg:text-base mt-1">
										{#if fixRunNumber(option.data.chateau_id, option.data.route_type, option.data.route_id, option.data.trip_short_name, option.data.vehicle_id)}
											<span
												style={`background-color: ${option.data.colour}; color: ${option.data.text_colour};`}
												class="font-bold text-md px-1 py-0.5 mr-1 rounded-sm"
												>{fixRunNumber(
													option.data.chateau_id,
													option.data.route_type,
													option.data.route_id,
													option.data.trip_short_name,
													option.data.vehicle_id
												)}</span
											>
										{/if}
										{#if option.data.headsign && option.data.headsign != option.data.route_long_name && option.data.headsign != option.data.route_short_name}
											<span class="mr-1">
												<span class="material-symbols-outlined mr-0 align-middle -translate-y-0.5"
													>chevron_right</span
												>
												{fixHeadsignText(
													option.data.headsign,
													option.data.route_short_name || option.data.route_long_name
												)}
												{#if fixHeadsignIcon(option.data.headsign)}
													<span class="material-symbols-outlined text-sm align-middle"
														>{fixHeadsignIcon(option.data.headsign)}</span
													>
												{/if}
											</span>
										{/if}
										{#if option.data.vehicle_id && !(option.data.vehicle_id == fixRunNumber(option.data.chateau_id, option.data.route_type, option.data.route_id, option.data.trip_short_name, option.data.vehicle_id))}
											<span
												class="text-xs lg:text-base bg-gray-200 dark:bg-background px-1 rounded-md"
											>
												<span class="material-symbols-outlined !text-xs">directions_bus</span>
												{option.data.vehicle_id}</span
											>
										{/if}
									</p>
								</div>
							{/each}
						</div>
					{/if}

					{#if latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof RouteMapSelector).length > 0}
						<h3 class="text-xl my-2">{$_('routes')}</h3>
						<div class="flex flex-col gap-y-1 md:gap-y-2">
							{#each latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof RouteMapSelector) as option}
								<div
									class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-100 hover:bg-blue-100 dark:bg-darksky hover:dark:bg-hover text-sm md:text-base leading-snug rounded-lg"
									on:click={() => {
										data_stack_store.update((data_stack) => {
											data_stack.push(
												new StackInterface(
													new RouteStack(option.data.chateau_id, option.data.route_id)
												)
											);

											return data_stack;
										});
									}}
								>
								{
									#if show_gtfs_ids
								}
								<p>
									<span class="font-mono text-xs dark:text-gray-400 text-gray-500"
								>{option.data.chateau_id}</span
							>  
								{
									#if option.data.route_id
								
								}
								<span class="font-mono text-xs dark:text-gray-400 text-gray-500 ml-1 font-semibold"
								>{option.data.route_id.replace(/^\"/, "").replace(/\"$/, "")}</span
							>
								
								
							{/if}</p>
								{/if}
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
		<HomeButton />
		<div class="px-3 pt-1 flex flex-col h-full select-text">
			<h1 class="text-3xl font-medium mb-2">{$_('settings')}</h1>
			<span class="text-xl block">{$_('language')}</span>
			<select
				bind:value={$locale}
				class="text-black bg-white dark:bg-slate-900 dark:text-white p-1 border-2 my-1 border-seashore rounded-md"
			>
				{#each $locales as locale}
					<option value={locale} class="text-black bg-white dark:bg-slate-900 dark:text-white"
						>{locale_code_to_name(locale)}</option
					>
				{/each}
			</select>
			<span class="block my-2"></span>
			<span class="text-xl block mb-1">{$_('mapstyle')}</span>
			<div class="flex flex-row gap-x-2">
				<input
					type="checkbox"
					bind:checked={$usunits_store}
					class="accent-seashore"
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
			<div class="flex flex-row gap-x-2">
				<input
					type="checkbox"
					bind:checked={$show_gtfs_ids_store}
					class="accent-seashore"
					on:click={() => {
						show_gtfs_ids_store.update((x) => !x);
						window.localStorage.show_gtfs_ids = show_gtfs_ids_store;
					}}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							show_gtfs_ids_store.update((x) => !x);
							window.localStorage.show_gtfs_ids = show_gtfs_ids_store;
						}
					}}
				/>
				<p>{$_('show_gtfs_ids')}</p>
			</div>
			<div class="flex flex-row gap-x-2">
				<input
					type="checkbox"
					checked={window.localStorage.theme == 'dark'}
					class="accent-seashore"
					on:click={(e) => {
						if (e.target.checked) {
							window.localStorage.theme = 'dark';
							dark_mode_store.update((x) => true);
						} else {
							window.localStorage.theme = 'light';
							dark_mode_store.update((x) => false);
						}
						window.location.reload();
					}}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							if (e.target.checked) {
								window.localStorage.theme = 'dark';
								dark_mode_store.update((x) => true);
							} else {
								window.localStorage.theme = 'light';
								dark_mode_store.update((x) => false);
							}
							window.location.reload();
						}
					}}
				/>
				<p>{$_('darkmode')}</p>
			</div>
			<div class="flex flex-row gap-x-2">
				<input
					type="checkbox"
					checked={!simpleRouteMode}
					class="accent-seashore"
					on:click={(e) => {
						if (e.target.checked) {
							window.localStorage.simpleRouteMode = 'false';
							simpleRouteMode = false;
						} else {
							window.localStorage.simpleRouteMode = 'true';
							simpleRouteMode = true;
						}
					}}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							if (e.target.checked) {
								window.localStorage.simpleRouteMode = 'false';
								simpleRouteMode = false;
							} else {
								window.localStorage.simpleRouteMode = 'true';
								simpleRouteMode = true;
							}
						}
					}}
				/>
				<p>{$_('foamervision')}</p>
			</div>
		</div>
	{/if}
	{#if latest_item_on_stack.data instanceof VehicleSelectedStack}
		<div class="px-4 sm:px-2 lg:px-4 py-2 flex flex-col h-full">
			<HomeButton/>
			<p>
				Tripless vehicle selected
			</p>
			<p>
Chateau: <span class="font-mono text-semibold">{latest_item_on_stack.data.chateau_id}</span>
				
			</p>
			<p>Vehicle ID: <span  class="font-mono text-semibold">{latest_item_on_stack.data.vehicle_id}</span></p>
		</div>
	{/if}
	{#if latest_item_on_stack.data instanceof SingleTrip}
		<HomeButton />
		<div class="flex flex-col h-full select-text">
			<SingleTripInfo
				{usunits}
				{darkMode}
				routetype={latest_item_on_stack.data.route_type}
				trip_selected={latest_item_on_stack.data}
				{simpleRouteMode}
			/>
		</div>
	{/if}
	{#if latest_item_on_stack.data instanceof RouteStack}
		<HomeButton />
		<div class="flex flex-col h-full select-text">
			<RouteScreen {darkMode} routestack={latest_item_on_stack.data} />
		</div>
	{/if}
{:else if false}
	<p>Loading home page</p>
{:else}
	<div class="mt-3 mb-2">
		<img src="/logo.svg" alt="Catenary" class="h-5 inline align-middle pl-3 mr-2 -translate-y-2" />
		<button
			class="text-seashore cursor-pointer mx-1"
			on:click={() => {
				window.location.reload();
			}}
			aria-label="Refresh"
			><span class="material-symbols-outlined block"> refresh </span>
		</button>
		<button
			class="text-seashore cursor-pointer mx-2"
			on:click={() => {
				data_stack_store.update((x) => {
					x.push(new StackInterface(new SettingsStack()));
					return x;
				});
			}}
			aria-label="Settings"
			><span class="material-symbols-outlined block"> settings </span>
		</button>
	</div>
	{#if this_locale?.startsWith('en')}
		{#if false}
			<div
				class="text-sm lg:text-base py-2 px-4 sm:px-2 lg:px-4 border-sky-400 border-y-2 mb-2 bg-sky-100 dark:bg-sky-700 dark:bg-opacity-15"
			>
				<h2 class="text-lg font-semibold">We get there together.</h2>
				<p>
					Catenary is a student-led non-profit organization at the cutting edge of transit and
					routing research. We add features every day to our map, so come chat with us & give us
					your feedback on our Discord server!
				</p>
				<div class="mt-4 flex flex-row gap-x-2">
					<a target="_blank" href="https://discord.gg/yVV6dguwtq"
						><button class="bg-blue-600 font-bold text-white rounded-md px-2 py-1"
							>Join our Discord</button
						></a
					>
					<a target="_blank" href="https://catenarymaps.org"
						><button
							class="bg-white dark:bg-gray-950 font-bold rounded-md px-2 py-1 flex flex-row gap-x-1 text-[#42A7C5]"
							><img
								src="https://catenarymaps.org/logo.svg"
								class="inline mr-1 h-5 my-auto text-[#42A7C5]"
							/>Catenary Website</button
						></a
					>
				</div>
			</div>
		{/if}

		<!--<TidbitSidebarCard />-->
	{/if}
	<div class="py-1 flex flex-col h-full">
		<div class="flex flex-col h-full select-text"><NearbyDepartures {usunits} {darkMode} /></div>
	</div>
{/if}
