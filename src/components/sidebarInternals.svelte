<script lang="ts">
	// @ts-nocheck
	import { lightenColour } from './lightenDarkColour';
	import store from 'store2';
	import {
		MapSelectionScreen,
		StackInterface,
		MapSelectionOption,
		SingleTrip,
		VehicleMapSelector,
		RouteStack,
		StopStack,
		RouteMapSelector,
		VehicleSelectedStack,
		StopMapSelector,
		BlockStack
	} from '../components/stackenum';
	import HomeButton from './SidebarParts/home_button.svelte';
	import BackButton from './SidebarParts/back_button.svelte';
	import { SettingsStack } from '../components/stackenum';
	import SettingsMenu from './SettingsMenu.svelte';
	import NearbyDepartures from './NearbyDepartures.svelte';
	import { writable } from 'svelte/store';
	import { get } from 'svelte/store';
	import { data_stack_store, usunits_store, show_gtfs_ids_store } from '../globalstores';
	import { getLocaleFromNavigator, locale, locales, _ } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
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
	import { locales_options, locales_options_lookup } from '../i18n';
	import BlockScreen from './BlockScreen.svelte';

	import VehicleInfo from './vehicle_info.svelte';
	import StopScreen from './StopScreen.svelte';
	export let latest_item_on_stack: StackInterface | null;
	export let darkMode: boolean;
	export let usunits: boolean;

	let stops_preview_data = null;

	let show_gtfs_ids = get(show_gtfs_ids_store);

	show_gtfs_ids_store.subscribe((value) => {
		show_gtfs_ids = value;
	});

	let simpleRouteMode: boolean = true;

	if (typeof window !== 'undefined') {
		if (window.localStorage.getItem('simpleRouteMode') != 'false') {
			simpleRouteMode = true;
		} else {
			simpleRouteMode = false;
		}
	}

	//when latest item on stack changes, run queryStopsPreview

	$: {
		if (latest_item_on_stack != null) {
			if (latest_item_on_stack.data instanceof MapSelectionScreen) {
				queryStopsPreview();
			}
		}
	}

	function queryStopsPreview() {
		let chateaus_to_query = {};

		latest_item_on_stack.data.arrayofoptions.forEach((option) => {
			if (option.data instanceof StopMapSelector) {
				if (option.data.chateau_id in chateaus_to_query) {
					chateaus_to_query[option.data.chateau_id].push(option.data.stop_id);
				} else {
					chateaus_to_query[option.data.chateau_id] = [option.data.stop_id];
				}
			}
		});

		fetch('https://birch.catenarymaps.org/stop_preview', {
			body: JSON.stringify({
				chateaus: chateaus_to_query
			}),
			headers: {
				'Content-Type': 'application/json'
			},
			method: 'POST'
		})
			.then((response) => {
				if (response.ok) {
					return response.json();
				} else {
					throw new Error('Network response was not ok');
				}
			})
			.then((data) => {
				console.log('stops preview', data);
				stops_preview_data = data;
			});
	}
</script>

<div class="md:mt-12"></div>

{#if latest_item_on_stack != null}
	{#if latest_item_on_stack.data instanceof MapSelectionScreen}
		<HomeButton />
		<div class="px-4 flex flex-col w-full">
			<h1 class="text-lg md:text-2xl font-semibold leading-tight">
				{latest_item_on_stack.data.arrayofoptions.length}
				{$_('itemsselected')}
			</h1>
		</div>
		<div class="px-4 catenary-scroll overflow-y-auto pr-2 h-full pb-16">
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
							class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-100 dark:bg-darksky hover:bg-blue-100 hover:dark:bg-hover text-sm md:text-base leading-snug rounded-lg bg-opacity-80"
						>
							{#if show_gtfs_ids}
								<p>
									<span class="font-mono text-xs dark:text-gray-400 text-gray-500"
										>{option.data.chateau_id}</span
									>
									{#if option.data.route_id}
										<span
											class="font-mono text-xs dark:text-gray-400 text-gray-500 ml-1 font-semibold"
											>{option.data.route_id}</span
										>
									{/if}
								</p>
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
									<span class="text-xs lg:text-base bg-gray-200 dark:bg-background px-1 rounded-md">
										<span class="material-symbols-outlined !text-xs">directions_bus</span>
										{option.data.vehicle_id}</span
									>
								{/if}
							</p>
						</div>
					{/each}
				</div>
			{/if}

			{#if latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof StopMapSelector).length > 0}
				<h3 class="text-xl my-2">{$_('stops')}</h3>
				<div class="flex flex-col gap-y-1 md:gap-y-2">
					{#each latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof StopMapSelector) as option}
						<div
							class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-100 hover:bg-blue-100 dark:bg-darksky hover:dark:bg-hover text-sm md:text-base leading-snug rounded-lg bg-opacity-80"
							on:click={() => {
								data_stack_store.update((data_stack) => {
									data_stack.push(
										new StackInterface(new StopStack(option.data.chateau_id, option.data.stop_id))
									);

									return data_stack;
								});
							}}
						>
							<div>
								{#if show_gtfs_ids}
									<span class="font-mono text-xs dark:text-gray-400 text-gray-500"
										>{option.data.chateau_id}</span
									>
									{#if option.data.stop_id}
										<span class="font-mono text-xs dark:text-gray-400 text-gray-500"
											>{option.data.stop_id}</span
										>
									{/if}{/if}
							</div>

							<p>
								{option.data.stop_name}
							</p>

							{#if stops_preview_data}
								{#if stops_preview_data.stops[option.data.chateau_id] && stops_preview_data.stops[option.data.chateau_id][option.data.stop_id]}
									<div>
										{#if stops_preview_data.stops[option.data.chateau_id][option.data.stop_id].level_id}
											<span class="text-sm"
												>{$_('level')}
												{stops_preview_data.stops[option.data.chateau_id][option.data.stop_id]
													.level_id}</span
											>
										{/if}
										{#if stops_preview_data.stops[option.data.chateau_id][option.data.stop_id].platform_code}
											<span class="text-sm"
												>{$_('platform')}
												{stops_preview_data.stops[option.data.chateau_id][option.data.stop_id]
													.platform_code}</span
											>
										{/if}
									</div>

									<div class="flex flex-row gap-x-0.5 w-full flex-wrap gap-y-1">
										{#each stops_preview_data.stops[option.data.chateau_id][option.data.stop_id].routes as route_id}
											{#if stops_preview_data.routes[option.data.chateau_id][route_id]}
												<div
													class="px-1 py-0.5 md:py-1 text-xs rounded-sm"
													style={`background-color: ${stops_preview_data.routes[option.data.chateau_id][route_id].color}; color: ${stops_preview_data.routes[option.data.chateau_id][route_id].text_color};`}
												>
													{#if stops_preview_data.routes[option.data.chateau_id][route_id].short_name}
														<span class="font-medium"
															>{stops_preview_data.routes[option.data.chateau_id][route_id]
																.short_name}
														</span>
													{:else if stops_preview_data.routes[option.data.chateau_id][route_id].long_name}
														{stops_preview_data.routes[option.data.chateau_id][
															route_id
														].long_name.replace(' Line', '')}
													{/if}
												</div>
											{/if}
										{/each}
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof RouteMapSelector).length > 0}
				<h3 class="text-xl my-2">{$_('routes')}</h3>
				<div class="flex flex-col gap-y-1 md:gap-y-2">
					{#each latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof RouteMapSelector) as option}
						<div
							class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-100 hover:bg-blue-100 dark:bg-darksky hover:dark:bg-hover text-sm md:text-base leading-snug rounded-lg bg-opacity-80"
							on:click={() => {
								data_stack_store.update((data_stack) => {
									data_stack.push(
										new StackInterface(new RouteStack(option.data.chateau_id, option.data.route_id))
									);

									return data_stack;
								});
							}}
						>
							{#if show_gtfs_ids}
								<p>
									<span class="font-mono text-xs dark:text-gray-400 text-gray-500"
										>{option.data.chateau_id}</span
									>
									{#if option.data.route_id}
										<span
											class="font-mono text-xs dark:text-gray-400 text-gray-500 ml-1 font-semibold"
											>{option.data.route_id.replace(/^\"/, '').replace(/\"$/, '')}</span
										>
									{/if}
								</p>
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
	{/if}
	{#if latest_item_on_stack.data instanceof SettingsStack}
		<SettingsMenu />
	{/if}
	{#if latest_item_on_stack.data instanceof BlockStack}
		<BlockScreen
			chateau={latest_item_on_stack.data.chateau_id}
			block_id={latest_item_on_stack.data.block_id}
			service_date={latest_item_on_stack.data.service_date}
		/>
	{/if}
	{#if latest_item_on_stack.data instanceof StopStack}
		{#key latest_item_on_stack.data.stop_id}
		<StopScreen
			chateau={latest_item_on_stack.data.chateau_id}
			stop_id={latest_item_on_stack.data.stop_id}
		/>
		{/key}
	{/if}
	{#if latest_item_on_stack.data instanceof VehicleSelectedStack}
		<div class="px-4 sm:px-2 lg:px-4 py-2 flex flex-col h-full">
			<HomeButton />
			<p>Tripless vehicle selected</p>
			<p>
				Chateau: <span class="font-mono text-semibold">{latest_item_on_stack.data.chateau_id}</span>
			</p>
			<p>
				Vehicle ID: <span class="font-mono text-semibold"
					>{latest_item_on_stack.data.vehicle_id}</span
				>
			</p>

			<VehicleInfo
				chateau={latest_item_on_stack.data.chateau_id}
				label={latest_item_on_stack.data.vehicle_id}
				route_id={null}
			/>
		</div>
	{/if}
	{#if latest_item_on_stack.data instanceof SingleTrip}
		<HomeButton />
		<SingleTripInfo
			{usunits}
			{darkMode}
			routetype={latest_item_on_stack.data.route_type}
			trip_selected={latest_item_on_stack.data}
		/>
	{/if}
	{#if latest_item_on_stack.data instanceof RouteStack}
	{#key latest_item_on_stack.data}
		<HomeButton />
		<RouteScreen {darkMode} routestack={latest_item_on_stack.data} />
	{/key}
	{/if}
{:else if false}
	<p>Loading home page</p>
{:else}
	<!--<div class=" md:mt-3 md:mb-1">
		<a href="https://catenarymaps.org">
			<img
				src="/logo.svg"
				alt="Catenary"
				class="h-5 inline align-middle pl-3 mr-2 -translate-y-2"
			/>
		</a>
		<button
			class="text-seashore dark:text-seashoredark cursor-pointer mx-1"
			on:click={() => {
				window.location.reload();
			}}
			aria-label="Refresh"
			><span class="material-symbols-outlined block"> refresh </span>
		</button>
		<button
			class="text-seashore dark:text-seashoredark cursor-pointer mx-2"
			on:click={() => {
				data_stack_store.update((x) => {
					x.push(new StackInterface(new SettingsStack()));
					return x;
				});
			}}
			aria-label="Settings"
			><span class="material-symbols-outlined block"> settings </span>
		</button>
	</div>-->
	<div class="py-1 flex flex-col h-full">
		<div class="flex flex-col h-full select-text"><NearbyDepartures {usunits} {darkMode} /></div>
	</div>
{/if}
