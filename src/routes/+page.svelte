<script lang="ts">
	import Githubbox from '../githubbox.svelte';

	import '../app.css';
</script>

<svelte:head
	><link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin={true} />
	<link
		href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<nav
	class="sticky bg-[#1a2536] flex flex-row gap-x-2 px-2 py-4 shadow-sm shadow-blue-100 shadow-opacity-50"
>
	<div class="flex flex-row gap-x-3">
		<img src="/logo1.png" class=" h-10" />
		<p class="text-white text-2xl font-semibold my-auto">Catenary Maps</p>
	</div>
	<div class="hidden ml-auto text-white my-auto mr-5 sm:flex flex-row gap-x-4" />
</nav>
<div class="hero-section overflow-x-clip">
	<div
		class="sm:flex md:flex-row mx-2 md:mx-4 lg:max-w-6xl lg:mx-auto py-10 md:py-16 lg:py-24 px-4 lg:px-2"
	>
		<div class="md:w-2/3 lg:w-1/2 mr-2 md:pr-4 pb-5 px-2">
			<p class="text-xl md:text-3xl lg:text-4xl tagline font-semibold text-white">
				Powerful Realtime Public Transit Data and Algorithms
			</p>
			<p class=" text-base md:text-xl text-blue-50 mt-4">
				We're a team of students innovating and designing routing, ETA, and processing algorithms,
				curating and displaying high quality realtime data.
			</p>

			<div class="flex flex-row gap-x-3 lg:gap-x-7 mt-5">
				<a href="https://catenarymaps.org/maps">
					<div
						class="px-5 py-3 text-white font-bold lg:text-lg bg-sky-500 shadow-lg shadow-sky-900 rounded-lg"
					>
						Beta Demo Map
					</div></a
				>
				<a
					href="https://discord.gg/QGeDJSQMYA"
                    
                target="_blank"
                referrerpolicy="no-referrer"
					class="px-5 py-3 text-white font-bold lg:text-lg bg-blue-700 shadow-lg shadow-blue-900 rounded-lg"
					><div>Join our Discord</div></a
				>
			</div>
		</div>

		<div class="md:w-1/3 lg:w-1/2 text-white">
			<a href="https://catenarymaps.org/map">
				<img
					src="/mainscreenshot.png"
					class="border-2 border-gray-700 md:max-w-2xl shadow-2xl shadow-blue-200/20 mx-auto rounded-2xl"
				/>
			</a>
		</div>
	</div>
</div>

<div class="bg-[#121a26]">
	<div class="text-white lg:max-w-6xl lg:mx-auto py-10 md:py-16 lg:py-24 px-8 lg:px-16">
		<p class="text-xl md:text-2xl font-medium">100% Open Source Algorithms and Applications</p>
		<p>Our codebase is focused around the Rust Programming Language and Flutter user interfaces</p>
		
        <div>
			<div   class='py-5'><a 
                target="_blank"
                referrerpolicy="no-referrer"
				href="https://github.com/catenarymaps"
				class=" px-5 py-3 text-white font-bold lg:text-lg bg-zinc-500 shadow-lg shadow-slate-500 rounded-lg"
				>Our GitHub</a
			></div>
		</div>
        <br />
		

		<div class="grid gap-x-5 gap-y-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
			<Githubbox
				reponame="Catenary Backend"
				link="https://github.com/CatenaryMaps/catenary-backend"
				description="Backend Rust Import Server, APIs for trip calculations, and routing algorithms"
			/>

			<Githubbox
				reponame="Flutter Frontend"
				link="https://github.com/CatenaryMaps/catenary-flutter"
				description="Flutter frontend for the map"
			/>

			<Githubbox
				reponame="Svelte Frontend"
				link="https://github.com/CatenaryMaps/catenary-frontend"
				description="Beta Web Version of our software, showing realtime vehicle locations, labelled routes and stops."
			/>

			<Githubbox
				reponame="Kactus"
				link="https://github.com/CatenaryMaps/kactus-gtfs-rt"
				description="Kactus is a Redis-based cache microservice which fetches GTFS-rt from thousands of agencies every second, and syncs with users and our routing algorithm."
			/>

			<Githubbox
				reponame="ZotGTFS"
				link="https://github.com/CatenaryMaps/zotgtfs"
				description="We reverse engineered the UCI Anteater Express Bus TransLoc API to create schedule and realtime feeds, which is now shown in our app."
			/>
		</div>
	</div>
</div>

<div class="bg-[#121a26]">
	<div class="text-white lg:max-w-6xl lg:mx-auto py-10 md:py-16 lg:py-24 px-8 lg:px-16">
		<p class="text-xl md:text-2xl font-semibold">Our Maintainers</p>

		<ul class="">
			<li>
				Kyler Chin<sup>1</sup> (he/him) - Founder, Director, Boardmember, Systems Programmer, Algorithms,
				Frontend, Design
			</li>
			<li>Kin Tsang (he/him) - Systems Architecture, Boardmember, Algorithms</li>
			<li>
				Andrew Shen (he/him)<sup>1</sup> - Frontend/Flutter, Boardmember
			</li>
			<li>
				Samuel Sharp (he/him)<sup>4</sup> - Frontend/Flutter, Design, UX/UI
			</li>
			<li>
				Andrew Bustos (he/him)<sup>5</sup> - Frontend/Flutter, User Design
			</li>
			<li>
				Josh Wong<sup>2/3</sup>(he/him) - Sysadmin, Systems Programmer, Algorithms
			</li>
		</ul>

		<p>
			1: University of California, Irvine <br />
			2: Santa Monica College <br />
			3: Don Bosco Technical Institute, Rosemead <br />
			4: San Diego High School <br />
			5: California State University, East Bay <br />
		</p>
	</div>
</div>

<style>
	:global(body) {
		font-family: 'Noto Sans', sans-serif;
		background-color: '#1a2536' !important;
		overflow-x: hidden;
	}

	p {
		font-family: 'Noto Sans', sans-serif;
	}

	.hero-section {
		background-color: #121a26;
	}
</style>
