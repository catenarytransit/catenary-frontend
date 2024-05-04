<script lang="ts">
	import { data_stack_store } from '../../globalstores';
</script>

<button
	class="h-8 w-8 text-black dark:text-white bg-sky-400 dark:bg-sky-700 rounded-full flex flex-col shadow-md"
    on:click={() => {
        data_stack_store.set([]);
    }}
	aria-label="Home"
	><div class="m-auto block">
		<span class="material-symbols-outlined block"> home </span>
	</div></button
>
