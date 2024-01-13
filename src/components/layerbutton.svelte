<script lang="ts">
	export let layersettings: any;
	export let name: string;
	export let selectedSettingsTab: string;
	export let runSettingsAdapt: any;
	export let urlicon: string;
	export let change: string;
	export let nestedchange: string = '';
</script>

<!-- {#if layersettings} -->
<!-- {#if layersettings[selectedSettingsTab]} -->
<div
	role="button"
	tabindex="0"
	on:click={() => {
		if (nestedchange != '') {
			Object.keys(layersettings[selectedSettingsTab][change]).forEach((element) => {
				console.log(element);
				layersettings[selectedSettingsTab][change][element] = false;
			});
			layersettings[selectedSettingsTab][change][nestedchange] = true;
		} else {
			layersettings[selectedSettingsTab][change] = !layersettings[selectedSettingsTab][change];
		}
		runSettingsAdapt();
	}}
	on:keydown={() => {
		if (nestedchange != '') {
			Object.keys(layersettings[selectedSettingsTab][change]).forEach((element) => {
				layersettings[selectedSettingsTab][change][element] = false;
			});
			layersettings[selectedSettingsTab][change][nestedchange] = true;
		} else {
			layersettings[selectedSettingsTab][change] = !layersettings[selectedSettingsTab][change];
		}
		runSettingsAdapt();
	}}
>
	{#if nestedchange}
		<!--Toggle Routes-->
		<div
			aria-label={`${name} button`}
			class:border-blue-500={layersettings[selectedSettingsTab][change][nestedchange] == true}
			class:dark:border-blue-50={layersettings[selectedSettingsTab][change][nestedchange] == true}
			class:border-transparent={layersettings[selectedSettingsTab][change][nestedchange] == false}
			class={`bg-[#f5f1f0] dark:bg-[#1C2738] rounded-xl border-2`}
		>
			<img src={urlicon} class="w-14 h-14" alt="" />
		</div>
		<p class="text-sm text-center">{name}</p>
	{:else}
		<div
			aria-label={`${name} button`}
			class:border-blue-500={layersettings[selectedSettingsTab][change] == true}
			class:dark:border-blue-50={layersettings[selectedSettingsTab][change] == true}
			class:border-transparent={layersettings[selectedSettingsTab][change] == false}
			class={`bg-[#f5f1f0] dark:bg-[#1C2738] rounded-xl border-2`}
		>
			<img src={urlicon} class="w-14 h-14" alt="" />
		</div>
		<p class="text-sm text-center">{name}</p>
	{/if}
</div>
<!-- {/if}{/if} -->
