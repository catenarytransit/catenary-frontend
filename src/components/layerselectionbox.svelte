<script lang="ts">
	export let text: string;
	export let changesetting: (event: MouseEvent | KeyboardEvent) => void;
	export let cssclass: string;

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			changesetting(event);
		}
	}
</script>

<div role="button" tabindex="0" on:click={changesetting} on:keydown={handleKeydown} class={cssclass}>
	<p class="w-full align-center text-center">{text}</p>
</div>
