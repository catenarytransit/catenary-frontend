<script lang="ts">
    export let imageURL = '';
    export let background = '';
</script>

<div
    class="pointer-events-none text-white pointer-events-auto clickable w-[100%] mb-2 mt-2"
    style:padding="15px"
    style:border-radius="10px"
    style:background={background}
    style:background-size="cover"
>
    {#if imageURL}
        <img src={imageURL} style:height="70px" class="m-2" />
    {/if}
    <slot />
</div>