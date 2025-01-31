<script lang="ts">
	import { data_stack_store, map_pointer_store } from '../../globalstores';
	import { get } from 'svelte/store';
	import { SettingsStack, StackInterface } from '../stackenum';
</script>

<div class="mt-3 mb-2 select-none">
	<img src="/logo.svg" alt="Catenary" class="h-5 inline align-middle pl-3 mr-2 -translate-y-2" />
	<button
		class="text-seashore cursor-pointer mx-1"
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
		class="text-seashore cursor-pointer mx-2"
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
