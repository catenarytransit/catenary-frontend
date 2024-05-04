<script lang="ts">
 	import { lightenColour } from './lightenDarkColour';
     import {
		MapSelectionScreen,
		StackInterface,
		MapSelectionOption,
		SingleTrip,
		VehicleMapSelector,
		RouteStack,
		StopStack,
		RouteMapSelector
	} from '../components/stackenum';
	import HomeButton from './SidebarParts/home_button.svelte';
 
    export let latest_item_on_stack: StackInterface | null;
	export let darkMode: boolean;
 
    </script>

			{#key latest_item_on_stack}
				{#if latest_item_on_stack != null}
					{#if latest_item_on_stack.data instanceof MapSelectionScreen}
						<div class="px-4 sm:px-2 lg:px-4 py-2 flex flex-col h-full">
							<div class="flex flex-row gap-x-2">
								<HomeButton />
							</div>
							<h1 class="text-lg md:text-2xl font-semibold">
								{latest_item_on_stack.data.arrayofoptions.length} items selected
							</h1>
							<p class="text-sm md:text-base">Click on any item from this list</p>
							<p class="italic text-xs sm:text-sm">
								Selecting doesn't do anything yet, will probably be finished around 2024 May 6
							</p>
							<div class="flex-grow-0 h-full">
								<div class=" overflow-y-auto h-full">
									{#if latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof VehicleMapSelector).length > 0}
										<h3 class="text-base sm:text-lg">Vehicles</h3>
										<div class="flex flex-col gap-y-1 md:gap-y-2">
											{#each latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof VehicleMapSelector) as option}
												<div
													class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-50 dark:bg-slate-800 shadow-md shadow-gray-500 dark:shadow-slate-700 text-sm md:text-base leading-snug"
												>
													{#if option.data.triplabel}
														{#if option.data.trip_short_name}
															<span
																style={`background-color: ${option.data.colour}; color: ${option.data.text_colour};`}
																class="font-bold font-mono px-1 py-0.5 rounded-sm">{option.data.trip_short_name}</span
															>
														{/if}
														{#if option.data.route_short_name}
															<span
																style={`color: ${darkMode ? lightenColour(option.data.colour) : option.data.colour}`}
																class="font-semibold">{option.data.route_short_name}</span
															>
														{/if}
														{#if option.data.route_long_name}
															<span
																style={`color: ${darkMode ? lightenColour(option.data.colour) : option.data.colour}`}
																>{option.data.route_long_name}</span
															>
														{/if}
														{#if option.data.chateau_id == 'san-diego-mts' && option.data.route_type == 0}
															<span class="">
																#{option.data.vehicle_id}
															</span>
														{/if}
													{:else}
														<p>No Trip</p>
													{/if}

													{#if option.data.headsign}
														<p>{option.data.headsign}</p>
													{/if}
													{#if option.data.vehicle_id && !(option.data.chateau_id == 'san-diego-mts' && option.data.route_type == 0)}
														<p>Vehicle {option.data.vehicle_id}</p>
													{/if}
												</div>
											{/each}
										</div>
									{/if}

									{#if latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof RouteMapSelector).length > 0}
										<h3 class="text-base sm:text-lg">Routes</h3>
										<div class="flex flex-col gap-y-1 md:gap-y-2">
											{#each latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof RouteMapSelector) as option}
												<div
													class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-50 dark:bg-slate-800 shadow-md shadow-gray-500 dark:shadow-slate-700 text-sm md:text-base"
												>
													<p>{option.data.chateau_id}</p>
													{#if option.data.name}
														<span
															style={`color: ${darkMode ? lightenColour(option.data.colour) : option.data.colour}`}
															>{option.data.name}</span
														>
													{/if}
												</div>
											{/each}
										</div>
									{/if}
									<br />
									<br />
									<br />
								</div>
							</div>
						</div>
					{:else}
						<p>Not map selection screen</p>
					{/if}
				{:else}
					<div class="px-4 sm:px-2 lg:px-4 py-2">
						<div class="flex flex-row gap-x-2"><button 
							class="h-8 w-8 text-black dark:text-white bg-sky-400 dark:bg-sky-700 rounded-full flex flex-col shadow-md"
							on:click={() => {
								window.location.reload();
							}}
							aria-label="Refresh"
							><div class='m-auto block'><span class="material-symbols-outlined block">
								refresh
								</span></div></button></div>
						<p  class='text-sm md:text-base'>Click on any vehicle or route to get started.</p>
						<p class='text-xs md:text-sm'>Catenary Maps version 2024-05-04 08:18 Z</p>
						
						<div></div>

						<h2 class="text-base md:text-lg">Nearby Departures</h2>
						<p>Coming soon!</p>
					</div>
				{/if}
			{/key}