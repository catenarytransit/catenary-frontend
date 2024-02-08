<script lang="ts" context="module">
	export interface SelectedVehicleKeyType {
		realtime_feed_id: string;
		id: string;
	}
</script>

<script lang="ts">
	import mapboxgl from 'mapbox-gl';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
	import { durationToIsoElapsed } from '../utils/isoelapsed';
	import { afterUpdate, onMount } from 'svelte';
	export let strings: Record<string, string>;
	export let selectedVehicleLookup: SelectedVehicleLookup;
	export let map: mapboxgl.Map;
    export let usunits: boolean;
	export let darkMode: boolean;
	export let vehicleOnlyGtfsRt: GtfsRealtimeBindings.transit_realtime.FeedEntity; // single row of gtfs rt entity data with VehiclePosition in it

	let circleStyle: string = '';

	let current_time: Date = new Date();

	//Type safety has already been guranteed
	// @ts-expect-error
	let ms_from_now_to_last_update: number | null =
		typeof vehicleOnlyGtfsRt.vehicle.timestamp === 'number' &&
		typeof vehicleOnlyGtfsRt.vehicle != 'null' &&
		typeof vehicleOnlyGtfsRt.vehicle != 'undefined'
			? vehicleOnlyGtfsRt.vehicle.timestamp * 1000 - Date.now()
			: null;

	afterUpdate(() => {
		console.log('selected vehicle data', vehicleOnlyGtfsRt);
	});

	onMount(() => {
		const interval = setInterval(() => {
			current_time = new Date();
			if (typeof vehicleOnlyGtfsRt != 'null' && typeof vehicleOnlyGtfsRt != 'undefined') {
				if (
					typeof vehicleOnlyGtfsRt.vehicle != 'null' &&
					typeof vehicleOnlyGtfsRt.vehicle != 'undefined'
				) {
					ms_from_now_to_last_update = vehicleOnlyGtfsRt.vehicle.timestamp * 1000 - Date.now();

					if (ms_from_now_to_last_update < -5000) {
						circleStyle = `opacity: 0`;
					} else {
						let opacity = 1 - (0 - ms_from_now_to_last_update) / 5000;
						circleStyle = `opacity: ${opacity}`;
					}
				}
			}
		}, 20);

		return () => {
			clearInterval(interval);
		};
	});

	import mtsFleetData from '../data/fleet/f-mts~rt~onebusaway.json';
	import metroFleetData from '../data/fleet/f-metro~losangeles~rail~rt.json';
	import nctdFleetData from '../data/fleet/f-northcountrytransitdistrict~rt.json';

	const expandMetrolink = {
		AV: 'Antelope Valley',
		IEOC: 'Inland Empire-Orange County',
		OC: 'Orange County',
		SB: 'San Bernardino',
		VC: 'Ventura County',
		'91': '91/Perris Valley',
		RIV: 'Riverside',
		'AV LINE': 'Antelope Valley Line',
		'IEOC LINE': 'Inland Empire-Orange County Line',
		'OC LINE': 'Orange County Line',
		'SB LINE': 'San Bernardino Line',
		'VC LINE': 'Ventura County Line',
		'91/PV Line': '91 Line',
		'RVS LINE': 'Riverside Line',
		'PAC SURF': 'Pacific Surfliner',
		ARROW: 'Arrow Service'
	};

	const expandMetra = {
		'MD-N': 'Milwaukee District North',
		NCS: 'North Central Service',
		'UP-N': 'Union Pacific North',
		'UP-NW': 'Union Pacific Northwest',
		HC: 'Heritage Corridor',
		ME: 'Metra Electric',
		RI: 'Rock Island',
		SWS: 'SouthWest Service',
		BNSF: 'BNSF',
		'MD-W': 'Milwaukee District West',
		'UP-W': 'Union Pacific West'
	};

	const fleetData = {
		'f-mts~rt~onebusaway': mtsFleetData,
		'f-metro~losangeles~rail~rt': metroFleetData,
		'f-northcountrytransitdistrict~rt': nctdFleetData
	};
</script>

{#if vehicleOnlyGtfsRt.vehicle}
	<p class="font-mono text-sm">{selectedVehicleLookup.realtime_feed_id}</p>
	<p class="font-mono text-sm">ID: {selectedVehicleLookup.id}</p>

	<!--
    {#if selectedVehicleLookup.realtime_feed_id == 'f-mts~rt~onebusaway'}
					<h1
						style:color={darkMode
							? selectedVehicle.properties.contrastdarkmode
							: selectedVehicle.properties.color}
						class="text-3xl"
					>
						{#if selectedVehicle.properties.maptag == 'Green'}
							<img
								src="/lines/mts-green.svg"
								style:height="50px"
								style:float="left"
								style:margin-right="15px"
								alt="MTS Green Line Palm Tree logo"
							/>
						{:else if selectedVehicle.properties.maptag == 'Orange'}
							<img
								src="/lines/mts-orange.svg"
								style:height="50px"
								style:float="left"
								style:margin-right="15px"
								alt="MTS Orange Line Sun logo"
							/>
						{:else if selectedVehicle.properties.maptag == 'Blue'}
							<img
								src="/lines/mts-blue.svg"
								style:height="50px"
								style:float="left"
								style:margin-right="15px"
								alt="MTS Blue Line Wave logo"
							/>
						{/if}
						{selectedVehicle.properties.maptag}
					</h1>
				{/if}
				{#if selectedVehicleLookup.realtime_feed_id == 'f-northcountrytransitdistrict~rt'}
					{#if selectedVehicle.properties.maptag == 'COASTER'}
						<img src="/lines/nctd-coaster.svg" style:height="30px" alt="Coaster logo" />
					{:else if selectedVehicle.properties.maptag == 'SPRINTER'}
						<img src="/lines/nctd-sprinter.svg" style:height="30px" alt="Sprinter logo"/>
					{:else if selectedVehicle.properties.maptag == '350'}
						<img src="/lines/nctd-brt.svg" style:height="30px" alt=""/>
						<h1
							style:color={darkMode
								? selectedVehicle.properties.contrastdarkmode
								: selectedVehicle.properties.color}
							class="text-3xl"
						>
							350
						</h1>
					{:else}
						<h1
							style:color={darkMode
								? selectedVehicle.properties.contrastdarkmode
								: selectedVehicle.properties.color}
							class="text-3xl"
						>
							{selectedVehicle.properties.maptag}
						</h1>
					{/if}
				{/if}
				{#if selectedVehicleLookup.realtime_feed_id == 'f-metro~losangeles~rail~rt'}
					<img
						src="/lines/metro.svg"
						style:height="50px"
						style:float="left"
						style:vertical-align="bottom"
						style:padding-right="10px"
					/>
					<img
						src="/lines/metro-{selectedVehicle.properties.maptag.toLowerCase()}.svg"
						style:height="50px"
						style:vertical-align="bottom"
					/>
				{/if}
				{#if selectedVehicleLookup.realtime_feed_id == 'f-metro~losangeles~bus~rt'}
					<h1
						style:color={darkMode
							? selectedVehicle.properties.contrastdarkmode
							: selectedVehicle.properties.color}
						class="text-3xl"
					>
						<img
							src={`/lines/metro.svg`}
							style:height="35px"
							style:float="left"
							style:vertical-align="middle"
						/>
						&nbsp;
						{selectedVehicle.properties.maptag}
					</h1>
				{/if}
				{#if selectedVehicleLookup.realtime_feed_id == 'f-metrolinktrains~rt'}
					<h1
						style:color={darkMode
							? selectedVehicle.properties.contrastdarkmode
							: selectedVehicle.properties.color}
						class="text-3xl"
					>
						<img
							src="https://metrolinktrains.com/favicon.ico"
							style:height="40px"
							style:float="left"
						/>
						&nbsp;
						<span class="font-black text-4xl">{selectedVehicle.properties.vehicleIdLabel}</span>
						{expandMetrolink[selectedVehicle.properties.maptag]} Line
					</h1>
				{/if}
				{#if selectedVehicleLookup.realtime_feed_id == 'f-octa~rt'}
					<img src="https://www.octa.net/dist/images/octa-logo.svg" style:height="60px" />
					<br />
				{/if}
				{#if selectedVehicleLookup.realtime_feed_id == 'f-metra~rt'}
					<img
						src="https://metra.com/themes/custom/metrarail/images/logo.svg"
						style:height="40px"
					/>
					<br />
					<h1
						style:color={darkMode
							? selectedVehicle.properties.contrastdarkmode
							: selectedVehicle.properties.color}
						class="text-3xl"
					>
						<img
							src={`https://ridertools.metrarail.com/sites/default/files/assets/maps-schedules/train-lines/trainline_${
								selectedVehicle.properties.maptag == 'ME' ||
								selectedVehicle.properties.maptag == 'RI'
									? selectedVehicle.properties.maptag == 'ME'
										? 'med'
										: 'rid'
									: selectedVehicle.properties.maptag.replace('-', '').toLowerCase()
							}.png`}
							style:height="35px"
							style:float="left"
						/>
						&nbsp;
						<span class="font-black text-4xl">{selectedVehicle.properties.vehicleIdLabel}</span>
						{expandMetra[selectedVehicle.properties.maptag]}
					</h1>
				{/if}
				{#if selectedVehicleLookup.realtime_feed_id == 'f-amtrak~rt'}
					<img
						src="https://www.amtrak.com/content/dam/projects/dotcom/english/public/images/logos/amtrak-logo__white.svg"
						style:height="30px"
					/>
					<h1
						style:color={darkMode
							? selectedVehicle.properties.contrastdarkmode
							: selectedVehicle.properties.color}
						class="text-3xl"
					>
						<span class="font-black text-4xl">{selectedVehicle.properties.tripIdLabel}</span>
						{selectedVehicle.properties.maptag}
					</h1>
				{/if}
				{#if selectedVehicleLookup.realtime_feed_id != 'f-mts~rt~onebusaway' && selectedVehicleLookup.realtime_feed_id != 'f-amtrak~rt' && selectedVehicleLookup.realtime_feed_id != 'f-metro~losangeles~rail~rt' && selectedVehicleLookup.realtime_feed_id != 'f-metrolinktrains~rt' && selectedVehicleLookup.realtime_feed_id != 'f-metra~rt' && selectedVehicleLookup.realtime_feed_id != 'f-metro~losangeles~bus~rt' && selectedVehicleLookup.realtime_feed_id != 'f-northcountrytransitdistrict~rt'}
					<h1
						style:color={darkMode
							? selectedVehicle.properties.contrastdarkmode
							: selectedVehicle.properties.color}
						class="text-3xl"
					>
						{selectedVehicle.properties.maptag}
					</h1>
				{/if}
				<br />
				
                -->
	{#if vehicleOnlyGtfsRt.vehicle.vehicle !== undefined && vehicleOnlyGtfsRt.vehicle.vehicle !== null}
		<b class="text-lg">{strings.vehicle}</b>
		{#if selectedVehicleLookup.realtime_feed_id == 'f-metra~rt'}
			{vehicleOnlyGtfsRt.vehicle.vehicle.id}
		{:else}
			{vehicleOnlyGtfsRt.vehicle.vehicle.label}{/if}
		<br />
	{/if}
	{#if vehicleOnlyGtfsRt.vehicle.trip}
		<b class="text-lg">{strings.trip} ID</b>
		{vehicleOnlyGtfsRt.vehicle.trip.tripId}
		<br />
	{/if}
	{#if vehicleOnlyGtfsRt.vehicle.position != undefined}
		{#if vehicleOnlyGtfsRt.vehicle.position.bearing !== null && vehicleOnlyGtfsRt.vehicle.position.bearing !== undefined && vehicleOnlyGtfsRt.vehicle.position.bearing !== 0}
			<div class="">
				<p>
					<b class="text-lg">{strings.bearing}</b>
					{vehicleOnlyGtfsRt.vehicle.position.bearing.toFixed(2)}°
				</p>
			</div>
		{/if}
		{#if typeof vehicleOnlyGtfsRt.vehicle.position.speed === 'number'}
        <p>
        <b class="text-lg">{strings.speed}</b>
			{#if usunits == false}
            {(3.6 * vehicleOnlyGtfsRt.vehicle.position.speed).toFixed(2)} km/h
			{:else}
			{(2.23694 * vehicleOnlyGtfsRt.vehicle.position.speed).toFixed(2)} mph
			{/if}
        </p>
		{/if}
	{/if}

	<div>
		{#if typeof vehicleOnlyGtfsRt.vehicle.timestamp == 'number' && typeof ms_from_now_to_last_update == 'number'}
			<div class="flex flex-row gap-x-0.5 align-middle items-center">
				<p class="font-mono text-sm"></p>
				{durationToIsoElapsed(ms_from_now_to_last_update)}
				<span
					class="inline-block rounded-full bg-green-500 dark:bg-green-500 h-3 w-3 mr-1"
					style={circleStyle}
				></span>
			</div>
			<p class="font-mono text-sm">
				{new Date(vehicleOnlyGtfsRt.vehicle.timestamp * 1000).toTimeString()}
			</p>
			<p class="font-mono text-sm">
				{new Date(vehicleOnlyGtfsRt.vehicle.timestamp * 1000).toISOString()}
			</p>
		{/if}
	</div>{/if}
