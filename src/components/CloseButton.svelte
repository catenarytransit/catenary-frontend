<script lang="ts">
    export let onclose:Function;
    export let moreclasses:string;
</script>

<div
on:keydown={onclose}
on:click={onclose}
class='border border-gray-500 bg-gray-700 rounded-full h-8 w-8  flex justify-center items-center'
>
    <span class={"material-symbols-outlined margin-auto select-none " + moreclasses}
   
> close </span>
</div>
