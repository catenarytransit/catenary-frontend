<script lang="ts">
	import { data_stack_store, map_pointer_store } from '../../globalstores';
	import { get } from 'svelte/store';
	import { SettingsStack, StackInterface } from '../stackenum';
</script>

<div class=" md:mt-3 md:mb-1 select-none">
	<a href="https://catenarymaps.org" target="_blank" rel="author">
		<img src="/logo.svg" alt="Catenary" class="h-5 inline align-middle pl-3 mr-2 -translate-y-2" />
	</a>

	<!-- Back button that shows if more than one item on stack -->

	{#if $data_stack_store.length > 1}
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
	<button
		class="text-seashore dark:text-seashoredark cursor-pointer mx-2"
		on:click={() => {
			data_stack_store.update((x) => {
				x.push(new StackInterface(new SettingsStack()));
				return x;
			});
		}}
		aria-label="Settings"
		><span class="material-symbols-outlined block"> settings </span>
	</button>
</div>
