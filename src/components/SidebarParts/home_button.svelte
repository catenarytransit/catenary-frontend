<script lang="ts">
	import { data_stack_store, map_pointer_store } from '../../globalstores';
	import { get } from 'svelte/store';
	import { SettingsStack, StackInterface } from '../stackenum';
</script>

<div class=" md:mt-0 md:mb-1 select-none flex flex-row">
	<!-- Back button that shows if more than one item on stack -->

	{#if $data_stack_store.length > 0}
		<button
			class="text-seashore dark:text-seashoredark cursor-pointer mx-1"
			on:click={() => {
				data_stack_store.update((x) => {
					x.pop();
					return x;
				});
			}}
			aria-label="Back"
			><span class="material-symbols-outlined block"> arrow_back </span>
		</button>
	{:else}
		<div class="mx-1">
			<span
				class="material-symbols-outlined block mx-1 cursor-pointer text-gray-100 dark:text-gray-800"
			>
				arrow_back
			</span>
		</div>
	{/if}

	<button
		class="text-seashore dark:text-seashoredark cursor-pointer mx-1"
		on:click={() => {
			data_stack_store.set([]);
			let map = get(map_pointer_store);

			if (map != null) {
				//set context layer as empty
				map.getSource('transit_shape_context')?.setData({
					type: 'FeatureCollection',
					features: []
				});

				map.getSource('stops_context')?.setData({
					type: 'FeatureCollection',
					features: []
				});

				map?.getSource('transit_shape_context_detour').setData({
					type: 'FeatureCollection',
					features: []
				});
			}
		}}
		aria-label="Home"
		><span class="material-symbols-outlined block"> home </span>
	</button>
</div>
