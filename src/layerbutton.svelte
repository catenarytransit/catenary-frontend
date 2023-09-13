<script lang='ts'>
 export let layersettings:any;
 export let name:string;
 export let selectedSettingsTab:string;
    export let runSettingsAdapt:any;
    export let urlicon:string;
    export let change:string;
</script>

<div on:click={() => {
    layersettings[selectedSettingsTab][change] = !layersettings[selectedSettingsTab][change] ;
    runSettingsAdapt();
}}

on:keydown={() => {
    layersettings[selectedSettingsTab][change]  = !layersettings[selectedSettingsTab][change] ;
    runSettingsAdapt();
}}
>
    <!--Toggle Routes-->
    <div
    class:border-blue-50={layersettings[selectedSettingsTab][change]  == true}
   class:border-transparent={layersettings[selectedSettingsTab][change]  == false}
    class={`bg-[#1C2738] rounded-xl border-2`}><img src={urlicon} class='w-14 h-14'/></div>
    <p  class='text-sm text-center '>{name}</p>
</div>