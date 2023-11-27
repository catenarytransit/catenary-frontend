<script lang="ts">
    export let imageURL = '';
    export let background = '';
</script>

<div
    class="fixed top-3 left-3 pointer-events-none text-white pointer-events-auto clickable lg:max-w-[25vw] max-w-[70vw]"
    style:padding="15px"
    style:border-radius="10px"
    style:background={background}
>
    <div
        on:click={() => {
            window.localStorage.alertPopupShown = 'hide';
            window.location.reload()
        }}
        style:cursor="pointer !important"
        class="border border-gray-500 bg-gray-700 rounded-full h-8 w-8 absolute right-2 top-2 flex justify-center items-center"
    >
        <span class="material-symbols-outlined margin-auto select-none"> close </span>
    </div>
    <img src={imageURL} style:height="70px" alt="" />
    <slot />
</div>