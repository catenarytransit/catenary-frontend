<script lang="ts">
	export let onclose: (event: KeyboardEvent | MouseEvent) => void;
	export let moreclasses: string;
	export let parentclass: string;

	/* Arbitrary keyboardevent handler */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			onclose(event);
		}
	}
</script>

<div role="button" tabindex="0" on:keydown={handleKeydown} on:click={onclose} class={parentclass}>
	<span class={'material-symbols-outlined select-none ' + moreclasses}> close </span>
</div>
