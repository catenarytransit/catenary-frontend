<script lang="ts">
 	import { lightenColour } from './lightenDarkColour';
 
 export let startmovesidebar: (event: MouseEvent | TouchEvent) => void;
    export let latest_item_on_stack: StackInterface | null;
 
    </script>

{#key on_sidebar_trigger}
			{#key latest_item_on_stack}
				{#if latest_item_on_stack != null}
					{#if latest_item_on_stack.data instanceof MapSelectionScreen}
						<div class="px-4 sm:px-2 lg:px-4 py-2 flex flex-col h-full">
							<h1 class="text-lg md:text-2xl font-semibold">
								{latest_item_on_stack.data.arrayofoptions.length} items selected
							</h1>
							<p class="text-sm md:text-base">Click on any item from this list</p>
							<p class="italic text-xs sm:text-sm">
								Selecting a route is coming soon, currently doesn't do anything
							</p>
							<div class="flex-grow-0 h-full">
								<div class=" overflow-y-auto h-full">
									{#if latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof VehicleMapSelector).length > 0}
										<h3 class="text-base sm:text-lg">Vehicles</h3>
										<div class="flex flex-col gap-y-1 md:gap-y-2">
											{#each latest_item_on_stack.data.arrayofoptions.filter((x) => x.data instanceof VehicleMapSelector) as option}
												<div
													class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-50 dark:bg-slate-800 shadow-sm text-sm md:text-base"
												>
													{#if option.data.triplabel}
														{#if option.data.trip_short_name}
															<span
																style={`color: ${darkMode ? lightenColour(option.data.colour) : option.data.colour}`}
																class="font-bold font-mono">{option.data.trip_short_name}</span
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
													class="px-1 py-0.5 md:px-2 md:py-2 bg-gray-50 dark:bg-slate-800 shadow-sm text-sm md:text-base"
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
					<p>Nothing in the stack</p>
				{/if}
			{/key}
		{/key}