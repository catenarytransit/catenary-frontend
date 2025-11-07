<script lang="ts">
    import { determineDarkModeToBool } from "../determineDarkModeToBool";
    import { lightenColour } from "../lightenDarkColour";

    export let route: any; // TODO: Define a proper interface for RouteInfo

    let is_dark_mode: boolean;
    $: is_dark_mode = determineDarkModeToBool();

    $: bgColor = route.color
    $: textColor = route.textColor
    $: text = route.short_name || route.long_name || "";
</script>

<div
    class="route-badge"
    style="background-color: {bgColor}; color: {textColor};"
>
    {text}
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
