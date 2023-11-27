<script lang="ts">
    export let onclose:Function;
    export let moreclasses:string;
</script>

<span class={"material-symbols-outlined margin-auto select-none" + moreclasses}
    on:keydown={onclose}
    on:click={onclose}
> close </span>