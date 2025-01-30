<script lang="ts">
	import { fly } from 'svelte/transition';

	export let imageURL = '';
	export let background = '';
</script>

<div
	class=" text-white pointer-events-auto clickable w-[100%] mb-2 mt-2"
	style:padding="15px"
	style:border-radius="10px"
	style:background
	style:background-size="cover"
	in:fly
>
	{#if imageURL}
		<img src={imageURL} style:height="70px" class="m-2" />
	{/if}
	<slot />
</div>
