<script lang="ts">
	import { onMount } from 'svelte';
	import {
		data_stack_store,
		on_sidebar_trigger_store,
		realtime_vehicle_locations_last_updated_store,
		realtime_vehicle_locations_store,
		realtime_vehicle_route_cache_hash_store,
		realtime_vehicle_route_cache_store,
		lock_on_gps_store,
		usunits_store,
		show_zombie_buses_store,
		show_my_location_store,
		custom_icons_category_to_layer_id,
		map_pointer_store,
		geolocation_store,
		chateaus_store,
		show_gtfs_ids_store,
		ui_theme_store,
		show_topo_global_store,
		current_orm_layer_type_store
	} from '../../globalstores';
	import {
		MTA_CHATEAU_ID,
		getMtaSubwayClass,
		isSubwayRouteId,
		getMtaSymbolShortName,
		isExpress
	} from '../../utils/mta_subway_utils';
	export let stop: any;
	import haversine from 'haversine-distance';

	export let stops_section: any;
	export let stop_ranked: any;
	let geolocation: GeolocationPosition | null;

	geolocation_store.subscribe((g) => {
		geolocation = g;
	});

	let distance_metres = 0;

	function recompute_distance() {
		const user = { latitude: geolocation.coords.latitude, longitude: geolocation.coords.longitude };

		const stop_pos = { latitude: stop.point.y, longitude: stop.point.x };

		distance_metres = haversine(user, stop_pos);
	}

	onMount(() => {
		if (geolocation) {
			recompute_distance();
		}
	});
</script>

<div>
	<p class="dark:text-white cursor-pointer flex flex-col content-start items-start text-left">
		{stop.name}
		{#if stop.code}
			<span class="font-light">{' '}{stop.code}</span>
		{/if}
	</p>

	<div class="flex flex-row gap-x-0.5 w-full flex-wrap gap-y-1">
		<p class="text-xs dark:text-gray-50 cursor-pointer">
			{#if geolocation}
				{#if distance_metres > 1000}
					{(distance_metres / 1000).toFixed(1)} km
				{:else}
					{distance_metres.toFixed(0)} m
				{/if}
			{/if}
		</p>

		{#if stops_section.routes[stop_ranked.chateau]}
			{#each stop.routes as route_id}
				{#if stops_section.routes[stop_ranked.chateau][route_id]}
					{@const routeInfo = stops_section.routes[stop_ranked.chateau][route_id]}
					{@const isSubway = isSubwayRouteId(route_id) && MTA_CHATEAU_ID == stop_ranked.chateau}
					{@const subwayShortName =
						isSubway && routeInfo.short_name ? getMtaSymbolShortName(routeInfo.short_name) : ''}
					{@const isRouteExpress = isSubway ? isExpress(route_id) : false}
					<div
						class={`px-0.5 py-0.25 text-xs rounded-sm ${
							isSubway
								? `subway-icon ${getMtaSubwayClass(routeInfo.short_name)} ${isRouteExpress ? 'express' : ''}`
								: ''
						}`}
						style={`
							${isSubway ? '' : `background-color: ${routeInfo.color}; color: ${routeInfo.text_color};`}
						`}
					>
						{#if isSubway}
							<span class="font-medium">{subwayShortName}{isRouteExpress ? 'X' : ''} </span>
						{:else if routeInfo.short_name}
							<span class="font-medium">{routeInfo.short_name} </span>
						{:else if routeInfo.long_name}
							{routeInfo.long_name.replace(' Line', '')}
						{/if}
					</div>
				{/if}
			{/each}
		{/if}
	</div>
</div>
