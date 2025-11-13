<script lang="ts">
	export let layersettings: any;
	export let name: string;
	export let selectedSettingsTab: string;
	export let runSettingsAdapt: any;
	export let symbol: string;
	export let change: string;

	function toggle() {
		layersettings[selectedSettingsTab].label[change] =
			!layersettings[selectedSettingsTab].label[change];
		runSettingsAdapt();
		console.log(layersettings[selectedSettingsTab].label[change]);
	}
</script>

{#if layersettings}
	{#if layersettings[selectedSettingsTab]}
		<div on:click={toggle} on:keydown={toggle}>
			<!--Toggle Routes-->
			<div
				class:border-blue-500={layersettings[selectedSettingsTab].label[change] == true}
				class:dark:border-blue-50={layersettings[selectedSettingsTab].label[change] == true}
				class:border-transparent={layersettings[selectedSettingsTab].label[change] == false}
				class={`bg-[#f5f1f0] dark:bg-[#1C2738] rounded-xl border-2 w-12 h-12 md:w-13 md:h-13 flex items-center align-center`}
			>
				<div class="mx-auto">
					<span class="material-symbols-outlined content-center text-xl md:text-2xl">
						{symbol}
					</span>
				</div>
			</div>
			<div class=" align-center items-center">
				<p class="text-sm text-center font-[Barlow_Semi_Condensed]">{name}</p>
			</div>
		</div>
	{/if}{/if}
