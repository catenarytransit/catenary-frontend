<script lang="ts">
	import mapboxgl from 'mapbox-gl';
	import { onMount } from 'svelte';
	import { decode as decodeToAry, encode as encodeAry } from 'base65536';
	let centerinit = [-118, 33.9];
	let zoominit = 8.1;

	const decode = (textToDecode: string) => {
		try {
			return new TextDecoder().decode(decodeToAry(textToDecode));
		} catch (e) {
			return 'Decode failed: Invalid input';
		}
	};

	onMount(() => {
		const map = new mapboxgl.Map({
			container: 'map',
			crossSourceCollisions: true,
			hash: 'pos',
			useWebGL2: true,
			preserveDrawingBuffer: false,
			attributionControl: false,
			//	antialias: true,
			style: '', // stylesheet location
			accessToken: decode(
				'ꉰ騮罹縱𒁪险ꌳ轳罘蹺鴲靰繩繳穭葩罩陪筪陳繪輰艈艷繄艺筮陷荘靨ꍄ荲鵄繫敮謮轤𔕰𖥊浊豧扁缭𠁎詫鐵ᕑ'
			),
			center: centerinit, // starting position [lng, lat]
			//keep the centre at Los Angeles, since that is our primary user base currently
			//switch to IP geolocation and on the fly rendering for this soon
			zoom: zoominit, // starting zoom (must be greater than 8.1)
			fadeDuration: 0
		});
	});
	let sidebarOpen: string = 'middle';
	let sidebar_height_output: string = '100vh';
	//percentage
	let sidebar_height_number: number = 40;
	//percentage
	let sidebar_height_target: number = 40;
	let previous_form_factor: string = 'mobile';
	let start_of_move_pointer_height: number | null = null;
	let start_of_move_sidebar_height: number | null = null;
	let last_sidebar_release: number | null = null;
	let last_sidebar_interval_id: Timeout | null = null;
	let map_padding: Record<string, number> = {};
	let previous_click_on_sidebar_dragger: number | null = null;
	let previous_y_velocity_sidebar: number | null = null;

	let currently_holding_sidebar_grabber: boolean = false;

	let darkMode = false;
	const urlParams =
		typeof window !== 'undefined'
			? new URLSearchParams(window.location.search)
			: new URLSearchParams();

	if (typeof window != 'undefined') {
		if (
			localStorage.theme === 'light' ||
			(urlParams.get('framework-colorway') == 'light' && embedmode) ||
			(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)
		) {
			console.log('dark mode triggered');
			document.documentElement.classList.remove('dark');
			darkMode = false;
		} else {
			document.documentElement.classList.add('dark');
			darkMode = true;
		}
	}

	function getSidebarOpenPercentage() {
		if (window.innerWidth >= 640) {
			return 0.55;
		} else {
			return 0.4;
		}
	}

	function gpsbutton_bottom_offset_calc() {
		if (typeof window != 'undefined') {
			if (window.innerWidth >= 640) {
				return '32px';
			} else {
				return `${32 - dragger + document.getElementById('catenary-sidebar')?.offsetHeight}px`;
			}
		} else {
			return '32px';
		}
	}

	const dragger = 24;

	function mousemovesidebar(e: TouchEvent | MouseEvent) {
		clearInterval(last_sidebar_interval_id);
		//	console.log('sidebar mouse move' ,e)
		//console.log('mousemovesidebar', Date.now(), e);

		//calculate y velocity

		let y_velocity = 0;

		let clientY = 0;
		if (e instanceof MouseEvent) {
			clientY = e.clientY;
		} else {
			clientY = e.touches[0].clientY;
		}

		if (previous_click_on_sidebar_dragger != null) {
			y_velocity = clientY - previous_click_on_sidebar_dragger;
			previous_y_velocity_sidebar = y_velocity;
		}

		previous_click_on_sidebar_dragger = clientY;

		//	console.log("previous_y_velocity_sidebar", previous_y_velocity_sidebar);

		if (window.innerWidth < 768) {
			if (start_of_move_pointer_height != null && start_of_move_sidebar_height != null) {
				let y_velocity = previous_y_velocity_sidebar || 0;
				//	console.log('difference and velocity', start_of_move_pointer_height - clientY, y_velocity)
				let difference = start_of_move_pointer_height - clientY - y_velocity;
				//console.log('sidebar new difference', difference);
				sidebar_height_number = start_of_move_sidebar_height + difference;
				//console.log('sidebar new height', sidebar_height_number);

				sidebar_height_output = sidebar_height_number + 'px';

				/*
					if (clientY < dragger) {
						sidebar_height_number = window.innerHeight - dragger;
					sidebar_height_output = window.innerHeight - dragger + "px";
					} else {
					//	console.log('below top bound')
						//sidebar_height_output = sidebar_height_number + "px";
						if (clientY > window.innerHeight - dragger) {
						//	console.log('at bottom bound')
							sidebar_height_number = dragger;
							sidebar_height_output = dragger + "px";
						} else {
						//	console.log('nominal')
							sidebar_height_number = sidebar_height_number;
							sidebar_height_output = sidebar_height_number + "px";
						}
					}*/

				if (clientY + 10 * y_velocity > 0.7 * window.innerHeight) {
					sidebarOpen = 'none';
				} else {
					if (clientY + 10 * y_velocity < 0.3 * window.innerHeight) {
						sidebarOpen = 'full';
					} else {
						sidebarOpen = 'middle';
					}
				}
			}
		}

		//console.log('sidebar new target', sidebarOpen, clientY);
	}

	function startmovesidebar(e: TouchEvent | MouseEvent) {
		currently_holding_sidebar_grabber = true;
		if (e instanceof MouseEvent) {
			start_of_move_pointer_height = e.clientY;
		} else {
			start_of_move_pointer_height = e.touches[0].clientY;
		}
		start_of_move_sidebar_height = document.getElementById('catenary-sidebar').offsetHeight;
		console.log('start moving sidebar');
	}

	function setSidebarOpen() {
		if (window.innerWidth < 768) {
			sidebarOpen = 'middle';
		} else {
			sidebarOpen = 'full';
		}

		moveToPos({});
	}

	function moveToPos(values: any) {
		console.log('let go sidebar');

		last_sidebar_release = performance.now();

		if (last_sidebar_interval_id != null) {
			clearInterval(last_sidebar_interval_id);
		}

		last_sidebar_interval_id = setInterval(() => {
			if (window.innerWidth < 768) {
				let target = 0.55 * window.innerHeight;

				if (sidebarOpen == 'full') {
					target = window.innerHeight - dragger;
				} else {
					if (sidebarOpen == 'none') {
						target = dragger;
					}
				}

				if (sidebar_height_number > innerHeight) {
					sidebar_height_number = innerHeight;
				}

				if (sidebar_height_number < dragger) {
					sidebar_height_number = dragger;
				}

				if (sidebar_height_number < target) {
					sidebar_height_number += 0.1 * (target - sidebar_height_number);
					sidebar_height_output = sidebar_height_number + 'px';
				} else {
					if (sidebar_height_number > target) {
						sidebar_height_number -= 0.1 * (sidebar_height_number - target);
						sidebar_height_output = sidebar_height_number + 'px';
					} else {
						clearInterval(last_sidebar_interval_id);
					}
				}
			}
		}, 1);
	}

	function letgosidebar(e: Event) {
		moveToPos({ event: e });
		//change_map_padding();
	}

	if (typeof window != 'undefined') {
		if (window.innerWidth < 768) {
			sidebarOpen = 'middle';
			sidebar_height_output = getSidebarOpenPercentage() * window.innerHeight + 'px';
			//px from bottom
			sidebar_height_number = dragger;
			//px from bottom
			sidebar_height_target = dragger;
			previous_form_factor = 'mobile';
		} else {
			sidebarOpen = 'full';
			sidebar_height_output = '100vh';
			//px from bottom
			sidebar_height_number = window.innerHeight - dragger;
			//px from bottom
			sidebar_height_target = window.innerHeight - dragger;
			previous_form_factor = 'desktop';
		}

		addEventListener('resize', (e) => {
			console.log('resize', window.innerWidth);

			if (previous_form_factor == 'mobile') {
				if ((sidebarOpen = 'full')) {
					sidebarOpen = 'middle';
				}
			}

			if (previous_form_factor == 'desktop') {
				if (sidebarOpen == 'middle') {
					sidebarOpen = 'full';
				}
			}

			if (window.innerWidth < 768) {
				previous_form_factor = 'mobile';
				if (sidebarOpen == 'full') {
					sidebar_height_output = window.innerHeight + 'px';
				}
				if (sidebarOpen == 'middle') {
					sidebar_height_output = getSidebarOpenPercentage() * window.innerHeight + 'px';
				} else {
					if (sidebarOpen == 'none') {
						sidebar_height_output = '20px';
					}
				}
			} else {
				previous_form_factor = 'desktop';
				sidebar_height_output = '100vh';
			}
		});

		addEventListener('touchmove', (e) => {
			console.log('touchmove', e);
			if (currently_holding_sidebar_grabber) {
				console.log('sidebar touchmove', e);
				mousemovesidebar(e);
			}
		});

		addEventListener('mousemove', (e) => {
			if (currently_holding_sidebar_grabber) {
				console.log('sidebar mousemove', e);
				mousemovesidebar(e);
			}
		});

		let sidebar_grabber = document.getElementById('catenary-grabber');

		if (sidebar_grabber != null) {
			sidebar_grabber.addEventListener('touchstart', (e) => {
				startmovesidebar(e);
			});

			sidebar_grabber.addEventListener('mousedown', (e) => {
				startmovesidebar(e);
			});
		} else {
			console.log('sidebar grabber not found');
		}

		addEventListener('touchend', (e) => {
			if (currently_holding_sidebar_grabber) {
				console.log('Let go');
				currently_holding_sidebar_grabber = false;
				letgosidebar(e);
			}
		});

		addEventListener('mouseup', (e) => {
			if (currently_holding_sidebar_grabber) {
				currently_holding_sidebar_grabber = false;
				letgosidebar(e);
			}
		});
	}
</script>

<div class="w-full">
	<div id="map" class="fixed top-0 left-0 w-[100vw] h-[100vh]" />
	<div
		id="catenary-sidebar"
		style={`height: ${sidebar_height_output}`}
		class="z-40 rounded-t-2xl md:rounded-none fixed bottom-0 shadow-lg dark:shadow-gray-800 w-full sm:w-2/5 md:h-full md:w-[380px] lg:w-[408px] bg-white dark:bg-slate-900 md:dark:bg-opacity-90 backdrop-blur-md md:bg-opacity-90 md:dark:backdrop-blur-md md:fixed md:left-0 md:top-0 md:bottom-0 text-black dark:text-white"
	>
		<div
			class="block md:hidden py-2 flex flex-row"
			on:mousedown={startmovesidebar}
			on:touchstart={startmovesidebar}
			aria-label="Move sidebar"
			role="none"
		>
			<div class="mx-auto rounded-lg px-8 py-1 bg-sky-500 dark:bg-sky-400"></div>
		</div>
		<div class="text-black dark:text-white">
			<p>This is the sidebar</p>
			<p>This is the sidebar</p>
			<p>This is the sidebar</p>
			<p>This is the sidebar</p>
			<p>This is the sidebar</p>
			<p>This is the sidebar</p>
		</div>
	</div>
</div>

<style>
	* {
		cursor: default;
		font-family: 'din-2014', sans-serif;
		user-select: none;
	}

	.material-symbols-outlined {
		font-family: 'Material Symbols Outlined', sans-serif;
	}

	:global(.mapboxgl-canvas) {
		outline: none;
	}

	.lineNumber {
		font-size: 1.2rem;
		font-weight: 600;
		padding: 5px;
		border-radius: var(--radius);
	}

	.lineLogo {
		margin-bottom: 15px;
	}

	.material-symbols-outlined-big {
		font-variation-settings:
			'FILL' 0,
			'wght' 400,
			'GRAD' 0,
			'opsz' 64;
	}
</style>
