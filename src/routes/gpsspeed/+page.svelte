<script lang="ts">
	let speed = 10.4;
</script>

<div
	style="font-size: 0px;"
	class="leading-tight text-sm md:text-base rounded-lg text-black bg-white dark:text-white border border-gray-500 dark:bg-slate-800 shadow-sm shadow-slate-400 dark:shadow-slate-700 px-1 py-0.5"
>
	<span class="font-bold text-sm">{(3.6 * speed).toFixed(2).split('.')[0]}</span>
	<span class="text-sm">.</span>
	<span class="text-xs">{(3.6 * speed).toFixed(1).split('.')[1]}</span>
	<br />

	<span class="text-xs">km/h</span>
</div>
