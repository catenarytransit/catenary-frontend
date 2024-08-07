<script lang="ts">
	import { data_stack_store, map_pointer_store } from '../../globalstores';
	import { get } from 'svelte/store';
</script>

<button
	class="h-8 w-8 text-black dark:text-white bg-sky-400 dark:bg-sky-700 rounded-full flex flex-col shadow-md"
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
	><div class="m-auto block">
		<span class="material-symbols-outlined block"> home </span>
	</div></button
>
