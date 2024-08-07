<script lang="ts">
	export let text: string;
	export let changesetting: Function;
	export let cssclass: string;
</script>

<div on:click={changesetting} on:keydown={changesetting} class={cssclass}>
	<p class="w-full align-center text-center">{text}</p>
</div>
