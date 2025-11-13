<script lang="ts">
	import MtaBullet from '../mtabullet.svelte';
	import {
		isSubwayRouteId,
		getMtaSubwayClass,
		getMtaSymbolShortName,
		isExpress,
		MTA_CHATEAU_ID
	} from '../../utils/mta_subway_utils';

	export let route: any; // TODO: Define a proper interface for RouteInfo

	export let chateau: string;
	export let route_id: string;

	$: bgColor = route.color;
	$: textColor = route.textColor;
	$: text = route.short_name || route.long_name || '';

	$: isSubway = isSubwayRouteId(route_id) && MTA_CHATEAU_ID == chateau;
</script>

{#if isSubway}
	<MtaBullet route_short_name={route.short_name} matchTextHeight={true} />
{:else}
	<div
		class="route-badge"
		style={`
			background-color: ${bgColor}; color: ${textColor};
		`}
	>
		{text}
	</div>
{/if}

<style>
	.route-badge {
		display: inline-block;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		line-height: 1;
	}
</style>
