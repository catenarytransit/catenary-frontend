<script lang="ts">
	export let onclose    : Function;
	export let moreclasses: string;
	export let parentclass: string;
</script>

<div on:keydown={onclose} on:click={onclose} class={parentclass}>
	<span class={'material-symbols-outlined select-none ' + moreclasses}> close </span>
</div>
