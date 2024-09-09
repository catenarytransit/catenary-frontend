<script lang="ts">
	import { data_stack_store, map_pointer_store } from '../../globalstores';
	import { get } from 'svelte/store';
</script>

<button
	class="m-3 h-10 w-10 text-seashore border-seashore border-2 rounded-full flex items-center justify-center"
	on:click={() => {
		data_stack_store.set([]);
		let map = get(map_pointer_store);

		if (map != null) {
			//set context layer as empty
			map.getSource('transit_shape_context').setData({
				type: 'FeatureCollection',
				features: []
			});

			map.getSource('stops_context').setData({
				type: 'FeatureCollection',
				features: []
			});
		}
	}}
	aria-label="Home"
	><span class="material-symbols-outlined block"> home </span></button
>
