<script lang="ts">
	import { onMount } from 'svelte';

	export let label: string;
	export let chateau: string;
	export let route_id: string | null;

	let vehicle_data: any = {};
	let loading_done = false;

	function freshGetData() {
		loading_done = false;

		let url = `https://birch.catenarymaps.org/get_vehicle?chateau=${chateau}&label=${label}`;

		if (route_id === null) {
			url = `https://birch.catenarymaps.org/get_vehicle?chateau=${chateau}&label=${label}`;
		} else {
			url = `https://birch.catenarymaps.org/get_vehicle?chateau=${chateau}&label=${label}&route_id=${route_id}`;
		}

		fetch(url)
			.then((response) => response.json())
			.then((data) => {
				console.log(data);

				if (data.found_data) {
					vehicle_data = data.vehicle;
				} else {
					vehicle_data = null;
				}
				loading_done = true;
			});
	}

	$: if (label) {
		freshGetData();
	}

	onMount(() => {
		freshGetData();
	});
</script>

<div>
	{#if loading_done}
		<div class="leading-none text-sm">
			{#if vehicle_data}
				<p class="inline-block gap-x-1">
					{#if vehicle_data.manufacturer}
						<span class="font-semibold">{vehicle_data.manufacturer}</span>
					{/if}
					{#if vehicle_data.model}
						<span class="italic">{vehicle_data.model}</span>
					{/if}
					{#if vehicle_data.years}
						<span>{vehicle_data.years.join(',')}</span>
					{/if}
				</p>

				<p class="inline-block gap-x-1">
					{#if vehicle_data.engine}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3 inline-block"
							><title>engine</title><path
								fill="currentColor"
								d="M7,4V6H10V8H7L5,10V13H3V10H1V18H3V15H5V18H8L10,20H18V16H20V19H23V9H20V12H18V8H12V6H15V4H7Z"
							/></svg
						>
						<span>{vehicle_data.engine}</span>
					{/if}
					{#if vehicle_data.transmission}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3 inline-block"
							><title>car-shift-pattern</title><path
								fill="currentColor"
								d="M8 5H4V2H8V5M4 22H8V19H4V22M14 2H10V5H14V2M10 22H14V19H10V22M16 2V5H20V2H16M17 11H13V7H11V11H7V7H5V17H7V13H11V17H13V13H19V7H17V11Z"
							/></svg
						>
						<span class="font-light">{vehicle_data.transmission}</span>
					{/if}
				</p>

				{#if vehicle_data.notes}
					<p>{vehicle_data.notes}</p>
				{/if}
			{/if}
		</div>
	{:else}
		<p class="loading monospace">...</p>
	{/if}
</div>

<style>
	.loading {
		display: inline-block;
		clip-path: inset(0 3ch 0 0);
		animation: l 1s steps(4, jump-none) infinite;
	}

	@keyframes l {
		to {
			clip-path: inset(0);
		}
	}
</style>
