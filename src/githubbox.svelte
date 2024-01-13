<script lang="ts">
	export let reponame: string;
	export let link: string;

	export let description: string;
</script>

<a class="text-white" href={link}>
	<div class="rounded-lg px-4 py-4 bg-zinc-800 h-full">
		<p class="font-semibold text-2xl">{reponame}</p>

		<p class="text-gray-100 mt-5">
			{description}
		</p>
	</div>
</a>
