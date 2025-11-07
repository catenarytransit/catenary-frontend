<script lang="ts">
    import { determineDarkModeToBool } from "../determineDarkModeToBool";
    import { isSubwayRouteId, getMtaSubwayClass, getMtaSymbolShortName, isExpress, MTA_CHATEAU_ID } from "../../utils/mta_subway_utils";


    export let route: any; // TODO: Define a proper interface for RouteInfo

    let is_dark_mode: boolean;
    $: is_dark_mode = determineDarkModeToBool();
    export let chateau: string;
    export let route_id: string;

    $: bgColor = route.color
    $: textColor = route.textColor
    $: text = route.short_name || route.long_name || "";

    $: isSubway = isSubwayRouteId(route_id) && MTA_CHATEAU_ID == chateau;
    $: subwayShortName = isSubway ? getMtaSymbolShortName(route.short_name) : '';
    $: isRouteExpress = isSubway ? isExpress(route_id) : false;
</script>

<div
    class={` ${
        isSubway
            ? `subway-icon ${getMtaSubwayClass(route.short_name)} ${isRouteExpress ? 'express' : ''}`
            : 'route-badge'
    }`}
    style={`
        ${
            isSubway
                ? ''
                : `background-color: ${bgColor}; color: ${textColor};`
        }
    `}
>
    {#if isSubway}
        <span class="font-medium">{subwayShortName}{isRouteExpress ? 'X' : ''}</span>
    {:else}
        {text}
    {/if}
</div>

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
