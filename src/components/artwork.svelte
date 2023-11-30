<script>
    export let name = '';
    export let artist = '';
    export let description = '';
    export let image = '';
</script>

<div
    class="pointer-events-none text-white pointer-events-auto clickable w-[100%] mb-2 mt-2 bg-[#0a233f]"
    style:border-radius="20px"
>
    <img src={image} style:border-radius="20px 20px 0 0" alt={name}>
    <div class="p-4">
        <h1 class="text-xl">{name}</h1>
        <h2 class="text-lg">{artist}, artist</h2>
        <div class="m-2" />
        <p>{description}</p>
    </div>
</div>