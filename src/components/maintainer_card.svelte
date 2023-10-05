<script lang="ts">
    export let name: string
    export let pronouns: string
    export let role: string
    export let school: string
    export let profilePicture: string
</script>

<div class="card "> 
    <img src={profilePicture} alt={`Portrait of ${name}`} class="mx-auto mb-2 h-[100px] rounded-full" />
    <h3 class='font-bold'>{name} ({pronouns})</h3>
    <p class='m-2'>{role}</p>
    <p class='m-2'><i class=''>{school}</i></p></div>

<style>
    .card {
    text-align: center;
    margin: 15px;
}

</style>