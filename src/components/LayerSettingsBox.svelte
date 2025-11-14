<script lang="ts">
	import { _ } from 'svelte-i18n';
	import CloseButton from './CloseButton.svelte';
	import Layerselectionbox from './layerselectionbox.svelte';
	import Layerbutton from './layerbutton.svelte';
	import Realtimelabel from '../realtimelabel.svelte';
	import {
		current_orm_layer_type_store,
		show_zombie_buses_store,
		show_my_location_store,
		show_topo_global_store
	} from '../globalstores';
	import { get } from 'svelte/store';

	export let layersettingsBox: boolean;
	export let layersettings: Record<string, any>;
	export let runSettingsAdapt: () => void;
	export let darkMode: boolean;
	export let usunits: boolean;
	export let current_locale: string;

	let selectedSettingsTab = 'localrail';

	const enabledlayerstyle =
		'text-black dark:text-white bg-blue-200 dark:bg-gray-700 border border-blue-800 dark:border-blue-200 text-sm md:text-sm';
	const disabledlayerstyle =
		'text-gray-900 dark:text-gray-50 border bg-gray-300 border-gray-400 dark:bg-gray-800  dark:border-gray-700 text-sm md:text-sm';

	let current_orm_layer_type: string | null = get(current_orm_layer_type_store);
	current_orm_layer_type_store.subscribe((value) => {
		current_orm_layer_type = value;
	});

	let showzombiebuses = get(show_zombie_buses_store);
	show_zombie_buses_store.subscribe((value) => {
		showzombiebuses = value;
	});

	let show_my_location = get(show_my_location_store);
	show_my_location_store.subscribe((value) => {
		show_my_location = value;
	});

	let show_topo = get(show_topo_global_store);
	show_topo_global_store.subscribe((value) => {
		show_topo = value;
	});
</script>

<div
	class="z-50 dark:shadow-slate-800 shadow-lg fixed bottom-0 w-full rounded-t-lg sm:w-fit sm:bottom-4 sm:right-4 bg-white dark:bg-gray-900 dark:text-gray-50 bg-opacity-90 dark:bg-opacity-90 sm:rounded-lg z-50 px-3 py-2 {layersettingsBox
		? ''
		: 'hidden'}"
>
	<div class="flex flex-row align-middle">
		<h2 class="font-bold text-gray-800 dark:text-gray-200">{$_('layers')}</h2>
		<div class="ml-auto">
			<CloseButton
				onclose={() => {
					layersettingsBox = false;
				}}
				moreclasses=""
				parentclass=""
			/>
		</div>
	</div>
	<div class="rounded-xl mx-0 my-2 flex flex-row w-full text-black dark:text-white">
		<Layerselectionbox
			text={$_('headingIntercityRail')}
			changesetting={() => {
				selectedSettingsTab = 'intercityrail';
			}}
			cssclass={`${
				selectedSettingsTab === 'intercityrail' ? enabledlayerstyle : disabledlayerstyle
			} w-1/2 py-1 px-1`}
		/>

		<Layerselectionbox
			text={$_('headingLocalRail')}
			changesetting={() => {
				selectedSettingsTab = 'localrail';
			}}
			cssclass={`${
				selectedSettingsTab === 'localrail' ? enabledlayerstyle : disabledlayerstyle
			} w-1/2 py-1 px-1`}
		/>

		<Layerselectionbox
			text={$_('headingBus')}
			changesetting={() => {
				selectedSettingsTab = 'bus';
			}}
			cssclass={`${selectedSettingsTab === 'bus' ? enabledlayerstyle : disabledlayerstyle} w-1/2 py-1 px-1`}
		/>

		<Layerselectionbox
			text={$_('headingOther')}
			changesetting={() => {
				selectedSettingsTab = 'other';
			}}
			cssclass={`${
				selectedSettingsTab === 'other' ? enabledlayerstyle : disabledlayerstyle
			} w-1/2 py-1 px-1`}
		/>

		<div
			on:click={() => {
				selectedSettingsTab = 'more';
			}}
			on:keydown={() => {
				selectedSettingsTab = 'more';
			}}
			class={`${
				selectedSettingsTab === 'more' ? enabledlayerstyle : disabledlayerstyle
			} w-1/2 py-1 px-1`}
			role="button"
			tabindex="0"
		>
			<p class="w-full align-center text-center">{$_('headingMisc')}</p>
		</div>
	</div>

	{#if selectedSettingsTab === 'more'}
		<div class="flex flex-col">
			<!--radio group that changes  current_orm_layer_type-->

			<!--First option, null-->

			<p class="font-bold">ORM</p>

			<div>
				<input
					on:click={() => {
						current_orm_layer_type_store.set(null);
					}}
					on:keydown={() => {
						current_orm_layer_type_store.set(null);
					}}
					type="radio"
					class="h-4 w-4 border-gray-300 focus:ring-2 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600"
					name="orm-layer-type"
					value="null"
					id="no-orm-data"
					checked={current_orm_layer_type == null}
				/>
				<label for="no-orm-data" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
					>{$_('noormdata')}</label
				>
			</div>

			<div>
				<input
					on:click={() => {
						current_orm_layer_type_store.set('infrastructure');
					}}
					on:keydown={() => {
						current_orm_layer_type_store.set('infrastructure');
					}}
					type="radio"
					class="h-4 w-4 border-gray-300 focus:ring-2 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600"
					name="orm-layer-type"
					value="infrastructure"
					id="orm-infra"
					checked={current_orm_layer_type == 'infrastructure'}
				/>
				<label for="orm-infra" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
					>{$_('orminfra')}</label
				>
			</div>
		</div>

		<div>
			<input
				on:click={() => {
					show_zombie_buses_store.update((value) => !value);
					localStorage.setItem('showzombiebuses', String(!showzombiebuses));
					runSettingsAdapt();
				}}
				on:keydown={() => {
					show_zombie_buses_store.update((value) => !value);
					localStorage.setItem('showzombiebuses', String(!showzombiebuses));
					runSettingsAdapt();
				}}
				checked={showzombiebuses}
				id="show-zombie-buses"
				type="checkbox"
				class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
			/>
			<label for="show-zombie-buses" class="ml-2">{$_('showtripless')}</label>
		</div>
		<div>
			<input
				on:click={() => {
					show_my_location_store.update((value) => !value);
					localStorage.setItem('show-my-location', String(!show_my_location));
					runSettingsAdapt();
				}}
				on:keydown={() => {
					show_my_location_store.update((value) => !value);
					localStorage.setItem('show-my-location', String(!show_my_location));
					runSettingsAdapt();
				}}
				checked={show_my_location}
				id="show-my-location"
				type="checkbox"
				class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
			/>
			<label for="show-my-location" class="ml-2">{$_('showmylocation')}</label>
		</div>

		<div>
			<input
				on:click={() => {
					show_topo_global_store.update((value) => !value);
					localStorage.setItem('show-topo', String(!show_topo));
					runSettingsAdapt();
				}}
				on:keydown={() => {
					show_topo_global_store.update((value) => !value);
					localStorage.setItem('show-topo', String(!show_topo));
					runSettingsAdapt();
				}}
				checked={show_topo}
				id="show-topo-toggle"
				type="checkbox"
				class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
			/>
			<label for="show-topo-toggle" class="ml-2">{$_('topo')}</label>
		</div>
	{/if}

	{#if ['other', 'bus', 'intercityrail', 'localrail'].includes(selectedSettingsTab)}
		<div class="flex flex-row gap-x-1">
			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="shapes"
				name={$_('routes')}
				urlicon="/routesicon.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="labelshapes"
				name={$_('labels')}
				urlicon="/labelsicon.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="stops"
				name={$_('stops')}
				urlicon="/stopsicon.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="stoplabels"
				name={$_('stopnames')}
				urlicon={darkMode ? '/dark-stop-name.png' : '/light-stop-name.png'}
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="visible"
				name={$_('vehicles')}
				urlicon="/vehiclesicon.svg"
				{runSettingsAdapt}
			/>
		</div>
		<div class="flex flex-row gap-x-1">
			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="route"
				name={$_('showroute')}
				symbol="route"
				{runSettingsAdapt}
			/>
			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="trip"
				name={$_('showtrip')}
				symbol="mode_of_travel"
				{runSettingsAdapt}
			/>
			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="vehicle"
				name={$_('showvehicle')}
				symbol="train"
				{runSettingsAdapt}
			/>

			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="headsign"
				name={$_('headsign')}
				symbol="sports_score"
				{runSettingsAdapt}
			/>

			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="speed"
				name={$_('showspeed')}
				symbol="speed"
				{runSettingsAdapt}
			/>

			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="occupancy"
				name={$_('occupancy')}
				symbol="group"
				{runSettingsAdapt}
			/>

			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="delay"
				name={$_('delay')}
				symbol="timer"
				{runSettingsAdapt}
			/>
		</div>
	{/if}
</div>