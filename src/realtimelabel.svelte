<script lang='ts'>
 export let layersettings:any;
 export let name:string;
 export let selectedSettingsTab:string;
    export let runSettingsAdapt:any;
    export let symbol:string;
    export let change:string;
    
</script>

<div on:click={() => {
    layersettings[selectedSettingsTab].label[change] = !layersettings[selectedSettingsTab].label[change] ;
    runSettingsAdapt();
    console.log(layersettings[selectedSettingsTab].label[change])
}}

on:keydown={() => {
    layersettings[selectedSettingsTab].label[change]  = !layersettings[selectedSettingsTab].label[change] ;
    runSettingsAdapt();
    console.log(layersettings[selectedSettingsTab].label[change])
}}
>
    <!--Toggle Routes-->
    <div
    class:border-blue-50={layersettings[selectedSettingsTab].label[change]  == true}
   class:border-transparent={layersettings[selectedSettingsTab].label[change]  == false}
    class={`bg-[#1C2738] rounded-xl border-2 w-14 h-14`}>
<div class='grid items-center align-center'><span class="material-symbols-outlined bakaka content-center">
    {symbol}
    </span></div>
</div>
    <p  class='text-sm text-center'>{name}</p>
</div>

<style>
.bakaka {
    font-size: 36px !important;
}
</style>