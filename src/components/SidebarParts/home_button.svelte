<script lang="ts">
	import { data_stack_store, map_pointer_store } from '../../globalstores';
	import { get } from 'svelte/store';
	import { SettingsStack, StackInterface } from '../stackenum';
</script>

<div class="pt-3 mb-2 sticky top-2 left-3 bg-gray-100 dark:bg-darksky z-50 inline rounded-md border border-seashore">
	<img src="/logo.svg" alt="Catenary" class="h-6 mx-3 inline align-middle -translate-y-2" />
	<button
		class="text-seashore cursor-pointer"
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
			}
		}}
		aria-label="Home"
		><span class="material-symbols-outlined block"> home </span>
	</button>
	<button
		class="text-seashore cursor-pointer mr-2 ml-1"
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
