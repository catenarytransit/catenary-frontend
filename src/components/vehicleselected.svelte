<script lang="ts" context="module">
	export interface SelectedVehicleKeyType {
		realtime_feed_id: string;
		id: string;
		properties: any;
	}
</script>

<script lang="ts">
	import type GtfsRealtimeBindings from 'gtfs-realtime-bindings';
	import { durationToIsoElapsed } from '../utils/isoelapsed';
	import { afterUpdate, onMount } from 'svelte';
	import { new_jeans_buses } from './addLayers/customIcons';
	export let strings: Record<string, string>;
	export let selectedVehicleLookup: SelectedVehicleKeyType;
	export let map: mapboxgl.Map;
	export let usunits: boolean;
	export let darkMode: boolean;
	export let properties: any;
	export let vehicleOnlyGtfsRt: GtfsRealtimeBindings.transit_realtime.FeedEntity; // single row of gtfs rt entity data with VehiclePosition in it

	//tuple feed id, vehicle id, time
	export let last_swiftly_fetch: Array<string | number> = [];

	interface SwiftlyValues {
		driver: string | null;
		headsign: string | null;
		schAdhSecs: number | null;
		id: string;
	}

	let swiftly_fetch_metadata: SelectedVehicleKeyType | null = null;
	let swiftly: SwiftlyValues | null = null;
	let circleStyle: string = '';

	let current_time: Date = new Date();

	//Type safety has already been guranteed
	let ms_from_now_to_last_update: number | null = default_ms_to_last_update();

	function default_ms_to_last_update(): number | null {
		if (typeof vehicleOnlyGtfsRt.vehicle === 'object') {
			if (typeof vehicleOnlyGtfsRt.vehicle.timestamp === 'number') {
				return vehicleOnlyGtfsRt.vehicle.timestamp * 1000 - Date.now();
			} else {
				return null;
			}
		} else {
			return null;
		}
	}

	afterUpdate(() => {
		//fetchSwiftlyInformation();
	});

	//super jank, should replace with a backend api in Aspen soon
	const SWIFTLY_KEYS: Record<string, string> = {
		'f-octa~rt': 'octa',
		'f-metro~losangeles~bus~rt': 'lametro',
		'f-metro~losangeles~rail~rt': 'lametro-rail',
		'f-northcountrytransitdistrict~rt': 'nctd',
		'f-bigbluebus~rt': 'big-blue-bus',
		'f-f25d-socitdetransportdemontral~rt': 'stm',
		'f-spokanetransitauthority~rt': 'spokane-sta',
		'f-santa~clarita~rt': 'vta',
		'f-wmata~bus~rt': 'wmata'
	};

	onMount(() => {
		console.log('selected vehicle data', vehicleOnlyGtfsRt);

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
			//	clearInterval(swiftlyinterval);
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
		ARROW: 'Arrow Service'
	};

	const expandMetra = {
		'MD-N': 'Milwaukee District North',
		NCS: 'North Central Service',
		'UP-N': 'Union Pacific North',
		'UP-NW': 'Union Pacific Northwest',
		HC: 'Heritage Corridor',
		ME: 'Metra Electric',
		RI: 'Rock Island District',
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

{#if properties}
	{#if selectedVehicleLookup.realtime_feed_id == 'f-translink~rt'}
		<img
			src="https://www.translink.ca/-/media/translink/logos/translink_logo.svg"
			class="h-10 md:h-12"
			alt="Translink"
		/>
	{/if}
	{#if selectedVehicleLookup.realtime_feed_id == 'f-calgarytransit~rt'}
		<img
			src="https://www.calgarytransit.com/etc/clientlibs/transit/v3/transit/main/images/Calgary-Transit-Logo.svg"
			alt="Calgary Transit"
			class="h-10 md:h-12"
		/>
	{/if}
	{#if selectedVehicleLookup.realtime_feed_id == 'f-f25d-socitdetransportdemontral~rt'}
		<img
			src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/STM_%28logo%2C_2010%29.svg/2560px-STM_%28logo%2C_2010%29.svg.png"
			alt="Société de transport de Montréal"
			class="h-10 md:h-12"
		/>
	{/if}
	{#if selectedVehicleLookup.realtime_feed_id == 'f-mts~rt~onebusaway'}
		<div class="flex flex-row align-middle">
			{#if properties.maptag == 'Green'}
				<img src="/lines/mts-green.svg" class="h-14" style:margin-right="15px" alt="Green Line" />
			{:else if properties.maptag == 'Orange'}
				<img src="/lines/mts-orange.svg" class="h-14" style:margin-right="15px" alt="Orange Line" />
			{:else if properties.maptag == 'Blue'}
				<img
					src="/lines/mts-blue.svg"
					class="h-14"
					style:margin-right="15px"
					alt="UC San Diego Blue Line"
				/>
			{:else}
				<h1
					style:color={darkMode ? properties.contrastdarkmode : properties.color}
					class="text-lg md:text-2xl"
				>
					{properties.maptag}
				</h1>
			{/if}
		</div>
	{/if}
	{#if selectedVehicleLookup.realtime_feed_id == 'f-metro~losangeles~rail~rt'}
		{#if properties.maptag.toLowerCase() == 'b' || properties.maptag.toLowerCase() == 'd'}
			<img src="/icons/la-hrv.png" style:width="60%" alt="" />
		{:else}
			<img src="/icons/la-lrv.png" style:width="50%" alt="" />
		{/if}
		<br />
	{/if}
	{#if selectedVehicleLookup.realtime_feed_id == 'f-metro~losangeles~bus~rt'}
		<img src="/icons/la-metrobus.png" style:width="40%" alt="" />
	{/if}
	{#if selectedVehicleLookup.realtime_feed_id == 'f-metrolinktrains~rt'}
		<img src="/icons/la-metrolink.png" alt="" />
		<br />
		<p
			style:color={darkMode ? properties.contrastdarkmode : properties.color}
			class="text-lg md:text-2xl"
		>
			<img
				src="https://metrolinktrains.com/favicon.ico"
				style:height="40px"
				style:float="left"
				alt="Metrolink"
			/>
			&nbsp;
			<span class="font-black text-4xl">{properties.vehicleIdLabel}</span>
			{expandMetrolink[properties.maptag]}
		</p>
	{/if}
	{#if selectedVehicleLookup.realtime_feed_id == 'f-metra~rt'}
		<p
			style:color={darkMode ? properties.contrastdarkmode : properties.color}
			class="text-lg md:text-2xl"
		>
			<img
				src={`https://ridertools.metrarail.com/sites/default/files/assets/maps-schedules/train-lines/trainline_${
					properties.maptag == 'ME' || properties.maptag == 'RI'
						? properties.maptag == 'ME'
							? 'med'
							: 'rid'
						: properties.maptag.replace('-', '').toLowerCase()
				}.png`}
				style:height="35px"
				style:float="left"
				alt=""
			/>
			&nbsp;
			<span class="font-black text-4xl">{properties.vehicleIdLabel}</span>
			{expandMetra[properties.maptag]}
		</p>
	{/if}
	{#if selectedVehicleLookup.realtime_feed_id == 'f-amtrak~rt'}
		<img
			src="https://www.amtrak.com/content/dam/projects/dotcom/english/public/images/logos/amtrak-logo__white.svg"
			alt="Amtrak"
			class="hidden dark:block h-8"
		/>
		<img
			src="https://www.amtrak.com/content/dam/projects/dotcom/english/public/images/logos/amtrak-logo__blue.svg"
			alt="Amtrak"
			class="h-8 block dark:hidden"
		/>
		<br />
		<h1
			style:color={darkMode ? properties.contrastdarkmode : properties.color}
			class="text-lg md:text-2xl"
		>
			<span class="font-black text-4xl">{properties.tripIdLabel}</span>
			{properties.maptag}
		</h1>
	{/if}
	{#if swiftly == null && !['f-amtrak~rt', 'f-mts~rt~onebusaway', 'f-metrolinktrains~rt', 'f-metra~rt'].includes(selectedVehicleLookup.realtime_feed_id)}
		<h1
			style:color={darkMode ? properties.contrastdarkmode : properties.color}
			class="text-lg md:text-2xl"
		>
			{properties.maptag}
		</h1>
	{/if}

	{#if new_jeans_buses[selectedVehicleLookup.realtime_feed_id]}
		{#if new_jeans_buses[selectedVehicleLookup.realtime_feed_id].has(properties.vehicleIdLabel)}
			<img alt="New Jeans" src="/icons/newjeanslogo.png" class="h-8" />
		{/if}{/if}

	{#if swiftly != null}
		{#if swiftly_fetch_metadata != null}
			{#if swiftly_fetch_metadata.id === selectedVehicleLookup.id && swiftly_fetch_metadata.realtime_feed_id === selectedVehicleLookup.realtime_feed_id}
				{#if swiftly.headsign}
					<p
						style:color={darkMode ? properties.contrastdarkmode : properties.color}
						class="text-lg md:text-2xl"
					>
						{#if selectedVehicleLookup.realtime_feed_id == 'f-metro~losangeles~rail~rt'}
							<img
								src="/lines/metro-{properties.maptag.toLowerCase()}.svg"
								style:height="30px"
								style:float="left"
								style:margin-right="10px"
								alt="{properties.maptag} Line"
							/>
						{:else}
							{properties.maptag}
							&rarr;&nbsp;
						{/if}
						{swiftly.headsign.replace('Uc Irvine', 'UC Irvine').replace(' Station', '')}
					</p>
				{/if}
			{/if}
		{/if}
	{/if}
{/if}

<div class="mt-2"></div>

{#if vehicleOnlyGtfsRt.vehicle}
	<span class="font-bold text-lg">{strings.provider}</span>
	{selectedVehicleLookup.realtime_feed_id}

	<br />

	{#if vehicleOnlyGtfsRt.vehicle.vehicle}
		<span class="font-bold text-lg">{strings.vehicle}</span>
		{vehicleOnlyGtfsRt.vehicle.vehicle.label || properties.vehicleIdLabel}
		<br />
	{:else if properties.vehicleIdLabel}
		<span class="font-bold text-lg">{strings.vehicle}</span>
		{properties.vehicleIdLabel}
		<br />
	{/if}

	{#if Object.keys(fleetData).includes(selectedVehicleLookup.realtime_feed_id)}
		{#each fleetData[selectedVehicleLookup.realtime_feed_id] as model}
			{#if (vehicleOnlyGtfsRt.vehicle.vehicle.label || properties.vehicleIdLabel).match(model.regex)}
				<span class="text-lg font-bold">{strings.type}</span>
				{model.type}
				<br />
				<span class="text-lg font-bold">{strings.fleet}</span>
				{model.year || ''}
				{model.manufacturer || ''}
				{model.model}
				<br />
			{/if}
		{/each}
	{/if}

	{#if vehicleOnlyGtfsRt.vehicle.trip}
		<span class="font-bold text-lg">{strings.trip} ID</span>
		{vehicleOnlyGtfsRt.vehicle.trip.tripId}
		<br />
	{/if}
	{#if vehicleOnlyGtfsRt.vehicle.position != undefined}
		{#if vehicleOnlyGtfsRt.vehicle.position.bearing !== null && vehicleOnlyGtfsRt.vehicle.position.bearing !== undefined && vehicleOnlyGtfsRt.vehicle.position.bearing !== 0}
			<div class="">
				<p>
					<span class="font-bold text-lg">{strings.bearing}</span>
					{vehicleOnlyGtfsRt.vehicle.position.bearing.toFixed(2)}°
				</p>
			</div>
		{/if}
		{#if typeof vehicleOnlyGtfsRt.vehicle.position.speed === 'number'}
			<p>
				<span class="font-bold text-lg">{strings.speed}</span>
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
				<span class="font-bold text-lg">{strings.lastupdated}</span>
				{durationToIsoElapsed(ms_from_now_to_last_update)}
				<span
					class="inline-block rounded-full bg-green-500 dark:bg-green-500 h-3 w-3 mr-1"
					style={circleStyle}
				></span>
			</div>

			{#if Object.keys(fleetData).includes(selectedVehicleLookup.realtime_feed_id)}
				{#each fleetData[selectedVehicleLookup.realtime_feed_id] as model}
					{#if (vehicleOnlyGtfsRt.vehicle.vehicle.label || properties.vehicleIdLabel).match(model.regex)}
						{#if model.image}
							<br />
							<img style:height="250px" src={model.image} alt={model.type} />
							{model.credit}
							<br />
						{/if}
					{/if}
				{/each}
			{/if}

			<p class="font-mono text-sm">
				Château: {properties.chateau}
			</p>

			<br />
			<p class="font-mono text-sm">
				{new Date(vehicleOnlyGtfsRt.vehicle.timestamp * 1000).toTimeString()}
			</p>
			<p class="font-mono text-sm">
				{new Date(vehicleOnlyGtfsRt.vehicle.timestamp * 1000).toISOString()}
			</p>
		{/if}
	</div>
{/if}
