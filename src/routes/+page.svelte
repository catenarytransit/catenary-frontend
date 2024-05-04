<script lang="ts">
	import mapboxgl from 'mapbox-gl';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import type { Writable } from 'svelte/store';
	import Realtimelabel from '../realtimelabel.svelte';
	import { decode as decodeToAry, encode as encodeAry } from 'base65536';
	import { createGeoJSONCircle, componentToHex } from '../geoMathsAssist';
	import SidebarInternals from '../components/sidebarInternals.svelte';
	import { addGeoRadius, setUserCircles } from '../components/userradius';
	import {
		dark_mode_store,
		data_stack_store,
		on_sidebar_trigger_store,
		realtime_vehicle_locations_last_updated_store,
		realtime_vehicle_locations_store,
		realtime_vehicle_route_cache_hash_store,
		realtime_vehicle_route_cache_store,
		lock_on_gps_store,
		usunits_store
	} from '../globalstores';
	import Layerbutton from '../components/layerbutton.svelte';
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
	import { setup_click_handler } from '../components/mapClickHandler';
	import i18n from '../i18n/strings';
	import { setup_load_map } from '../components/setup_load_map';
	import { interpretLabelsToCode } from '../components/rtLabelsToMapboxStyle';
	import { determineFeedsUsingChateaus } from '../maploaddata';
	import CloseButton from '../components/CloseButton.svelte';
	import Layerselectionbox from '../components/layerselectionbox.svelte';

	const enabledlayerstyle =
		'text-black dark:text-white bg-blue-200 dark:bg-gray-700 border border-blue-800 dark:border-blue-200 text-sm md:text-sm';
	const disabledlayerstyle =
		'text-gray-900 dark:text-gray-50 border bg-gray-300 border-gray-400 dark:bg-gray-800  dark:border-gray-700 text-sm md:text-sm';

	let centerinit = [-118, 33.9];

	let zoominit = 8.1;

	const decode = (textToDecode: string) => {
		try {
			return new TextDecoder().decode(decodeToAry(textToDecode));
		} catch (e) {
			return 'Decode failed: Invalid input';
		}
	};

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
	let last_sidebar_interval_id: number | null = null;
	let previous_click_on_sidebar_dragger: number | null = null;
	let previous_y_velocity_sidebar: number | null = null;
	let layersettingsBox = false;
	const layersettingsnamestorage = 'layersettingsv4';
	let currently_holding_sidebar_grabber: boolean = false;
	let maplat: number, maplng: number, mapzoom: number;
	let translate_x_sidebar: string = '0px';
	let translate_x_sidebar_number: number = 0;
	let collapser_left_offset_number: number = 408;
	let collapser_left_offset: string = '408px';

	let darkMode = true;

	let strings = i18n.en;
	let locale = 'en';
	let lockongps = false;

	lock_on_gps_store.subscribe((value) => {
		lockongps = value;
	});

	const lockonconst = 14.5;
	let firstmove = false;
	let secondrequestlockgps = false;

	let geolocation: GeolocationPosition;

	if (typeof window !== 'undefined') {
		// this must be fixed to allow subvariants of languages
		// @ts-expect-error
		strings = i18n[window.localStorage.language || 'en'];
		locale = window.localStorage.language || 'en';
	}

	//false means use metric, true means use us units
	let selectedSettingsTab = 'localrail';
	let usunits = false;

	usunits_store.subscribe((value) => {
		usunits = value;
	});

	let announcermode = false;
	//stores geojson data for currently rendered GeoJSON realtime vehicles data, indexed by realtime feed id
	let geometryObj: Record<string, any> = {};
	let lasttimeofnorth = 0;
	let westOfMinus52 = true;
	let feed_id_to_chateau_lookup: Record<string, string> = {};
	let chateau_to_realtime_feed_lookup: Record<string, string[]> = {};
	let pending_chateau_rt_request: Record<string, number> = {};
	let on_sidebar_trigger = 0;

	on_sidebar_trigger_store.subscribe((value) => {
		on_sidebar_trigger = value;
	});

	let data_stack: StackInterface[] = [];
	let latest_item_on_stack: StackInterface | null = null;

	data_stack_store.subscribe((value) => {
		data_stack = value;
		latest_item_on_stack = data_stack[data_stack.length - 1];
	});

	let mapglobal: mapboxgl.Map | null = null;

	const urlParams =
		typeof window !== 'undefined'
			? new URLSearchParams(window.location.search)
			: new URLSearchParams();
	let debugmode = !!urlParams.get('debug');

	let fpsmode = !!urlParams.get('fps');

	let embedmode = urlParams.get('framework') == 'true';

	let desktopapp = urlParams.get('desktop') == 'true';
	let mobileapp = urlParams.get('utm_source') == 'pwa';

	let current_map_heading = 0;

	let static_feeds_in_frame: Record<string, any> = {};
	let operators_in_frame: Record<string, any> = {};
	let realtime_feeds_in_frame: Record<string, any> = {};

	let lastrunmapcalc = 0;
	let mapboundingbox: number[][] = [
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0]
	];
	let mapboundingboxstring: String = '';

	//frame render duration in ms
	let last_render_start: number = 0;
	let frame_render_duration = 0;
	let fps = 0;
	let fps_array: number[] = [];

	let chateaus: any = null;
	let chateaus_in_frame: Writable<string[]> = writable([]);
	let showzombiebuses = writable(false);

	const layerspercategory = {
		bus: {
			livedots: 'bus',
			labeldots: 'labelbuses',
			pointing: 'busespointing',
			pointingshell: 'busespointingshell',
			stops: 'busstopscircle',
			labelstops: 'busstopslabel',
			shapes: 'busshapes',
			labelshapes: 'labelbusshapes'
		},
		intercityrail: {
			livedots: 'intercityrail',
			labeldots: 'labelintercityrail',
			pointing: 'intercityrailpointing',
			pointingshell: 'intercityrailpointingshell',
			stops: 'intercityrailstopscircle',
			labelstops: 'intercityrailstopslabel',
			shapes: 'intercityrailshapes',
			labelshapes: 'intercityraillabelshapes'
		},
		localrail: {
			livedots: 'localrail',
			labeldots: 'labellocalrail',
			pointing: 'localrailpointing',
			pointingshell: 'localrailpointingshell',
			stops: 'localrailstopscircle',
			labelstops: 'localrailstopslabel',
			shapes: 'localrailshapes',
			labelshapes: 'localraillabelshapes'
		},

		other: {
			livedots: 'other',
			labeldots: 'labelother',
			pointing: 'otherpointing',
			pointingshell: 'otherpointingshell',
			stops: 'otherstopscircle',
			labelstops: 'otherstopslabel',
			shapes: 'othershapes',
			labelshapes: 'otherlabelshapes'
		}
	};

	let layersettings: Record<string, any> = {
		bus: {
			visible: true,
			labelshapes: true,
			stops: true,
			shapes: true,
			stoplabels: true,
			label: {
				route: true,
				trip: false,
				vehicle: false,
				headsign: false,
				direction: false,
				speed: false
			}
		},
		localrail: {
			visible: true,
			stops: true,
			labelshapes: true,
			stoplabels: true,
			shapes: true,
			label: {
				route: true,
				trip: false,
				vehicle: false,
				headsign: false,
				direction: false,
				speed: false
			}
		},
		intercityrail: {
			visible: true,
			stops: true,
			labelshapes: true,
			stoplabels: true,
			shapes: true,
			label: {
				route: true,
				trip: true,
				vehicle: false,
				headsign: false,
				direction: false,
				speed: false
			}
		},
		other: {
			visible: true,
			stops: true,
			labelshapes: true,
			stoplabels: true,
			shapes: true,
			label: {
				route: true,
				trip: false,
				vehicle: false,
				headsign: false,
				direction: false,
				speed: false
			}
		},
		more: {
			foamermode: {
				infra: false,
				maxspeed: false,
				signalling: false,
				electrification: false,
				gauge: false,
				dummy: true
			},
			showstationentrances: true,
			showstationart: false,
			showbikelanes: false,
			showcoords: false
		}
	};

	function togglelayerfeature() {
		layersettingsBox = !layersettingsBox;
	}

	function runSettingsAdapt() {
		console.log('run settings adapt', layersettings);
		if (mapglobal) {
			if (layersettings.more.foamermode.infra) {
				mapglobal.setLayoutProperty('foamershapes', 'visibility', 'visible');
			} else {
				mapglobal.setLayoutProperty('foamershapes', 'visibility', 'none');
			}

			if (layersettings.more.foamermode.maxspeed) {
				mapglobal.setLayoutProperty('maxspeedshapes', 'visibility', 'visible');
			} else {
				mapglobal.setLayoutProperty('maxspeedshapes', 'visibility', 'none');
			}

			if (layersettings.more.foamermode.signalling) {
				mapglobal.setLayoutProperty('signallingshapes', 'visibility', 'visible');
			} else {
				mapglobal.setLayoutProperty('signallingshapes', 'visibility', 'none');
			}

			if (layersettings.more.foamermode.electrification) {
				mapglobal.setLayoutProperty('electrificationshapes', 'visibility', 'visible');
			} else {
				mapglobal.setLayoutProperty('electrificationshapes', 'visibility', 'none');
			}

			if (layersettings.more.foamermode.gauge) {
				mapglobal.setLayoutProperty('gaugeshapes', 'visibility', 'visible');
			} else {
				mapglobal.setLayoutProperty('gaugeshapes', 'visibility', 'none');
			}

			Object.entries(layerspercategory).map((eachcategory) => {
				let category = eachcategory[0];
				let categoryvalues = eachcategory[1];

				let shape = mapglobal.getLayer(categoryvalues.shapes);

				let this_layer_settings = layersettings[category];

				//console.log('processing settings',eachcategory, this_layer_settings)

				if (shape) {
					if (this_layer_settings.shapes) {
						mapglobal.setLayoutProperty(categoryvalues.shapes, 'visibility', 'visible');
					} else {
						mapglobal.setLayoutProperty(categoryvalues.shapes, 'visibility', 'none');
					}

					if (this_layer_settings.labelshapes) {
						mapglobal.setLayoutProperty(categoryvalues.labelshapes, 'visibility', 'visible');
					} else {
						mapglobal.setLayoutProperty(categoryvalues.labelshapes, 'visibility', 'none');
					}

					if (category === 'other') {
						if (this_layer_settings.shapes) {
							mapglobal.setLayoutProperty('ferryshapes', 'visibility', 'visible');
						} else {
							mapglobal.setLayoutProperty('ferryshapes', 'visibility', 'none');
						}
					}
				} else {
					console.log('could not fetch shapes layer', category);
				}

				let stoplayer = mapglobal.getLayer(categoryvalues.stops);
				if (stoplayer) {
					if (this_layer_settings.stops) {
						mapglobal.setLayoutProperty(categoryvalues.stops, 'visibility', 'visible');
					} else {
						mapglobal.setLayoutProperty(categoryvalues.stops, 'visibility', 'none');
					}
				} else {
					console.log('no stop layer found for', category);
				}

				let stopslabellayer = mapglobal.getLayer(categoryvalues.labelstops);
				if (stopslabellayer) {
					if (this_layer_settings.stoplabels) {
						mapglobal.setLayoutProperty(categoryvalues.labelstops, 'visibility', 'visible');
					} else {
						mapglobal.setLayoutProperty(categoryvalues.labelstops, 'visibility', 'none');
					}
				} else {
					console.log('no stops label layer found for ', category);
				}

				let dotcirclelayer = mapglobal.getLayer(categoryvalues.livedots);
				let dotlabel = mapglobal.getLayer(categoryvalues.labeldots);

				if (dotcirclelayer && dotlabel) {
					if (this_layer_settings.visible) {
						mapglobal.setLayoutProperty(categoryvalues.livedots, 'visibility', 'visible');
						mapglobal.setLayoutProperty(categoryvalues.labeldots, 'visibility', 'visible');
						mapglobal.setLayoutProperty(
							categoryvalues.labeldots,
							'text-field',
							interpretLabelsToCode(this_layer_settings.label, usunits)
						);
						[categoryvalues.pointing, categoryvalues.pointingshell].forEach((x) => {
							mapglobal.setLayoutProperty(x, 'visibility', 'visible');
						});
					} else {
						mapglobal.setLayoutProperty(categoryvalues.livedots, 'visibility', 'none');
						mapglobal.setLayoutProperty(categoryvalues.labeldots, 'visibility', 'none');
						[categoryvalues.pointing, categoryvalues.pointingshell].forEach((x) => {
							mapglobal.setLayoutProperty(x, 'visibility', 'none');
						});
					}
				} else {
					if (dotcirclelayer == null) {
						console.log('could not fetch dotcirclelayer', category);
					}
					if (dotlabel == null) {
						console.log('could not fetch dotlabel', category);
					}
				}

				let hidevehiclecommand = ['!=', '', ['get', 'tripIdLabel']];

				let regularpointers = [
					'all',
					['!=', 0, ['get', 'bearing']],
					['==', true, ['get', 'has_bearing']]
				];
				let hidevehiclecommandpointers = [
					'all',
					['!=', '', ['get', 'tripIdLabel']],
					['!=', 0, ['get', 'bearing']],
					['==', true, ['get', 'has_bearing']]
				];

				if (dotcirclelayer) {
					if (showzombiebuses === true) {
						mapglobal.setFilter(categoryvalues.livedots, undefined);
						mapglobal.setFilter(categoryvalues.labeldots, undefined);
						mapglobal.setFilter(categoryvalues.pointing, regularpointers);
						mapglobal.setFilter(categoryvalues.pointingshell, regularpointers);
					} else {
						mapglobal.setFilter(categoryvalues.livedots, hidevehiclecommand);
						mapglobal.setFilter(categoryvalues.labeldots, hidevehiclecommand);
						mapglobal.setFilter(categoryvalues.pointing, hidevehiclecommandpointers);
						mapglobal.setFilter(categoryvalues.pointingshell, hidevehiclecommandpointers);
					}
				}
			});

			localStorage.setItem(layersettingsnamestorage, JSON.stringify(layersettings));

			true;
		}
	}

	if (typeof window != 'undefined') {
		if (
			localStorage.theme === 'light' ||
			(urlParams.get('framework-colorway') == 'light' && embedmode) ||
			(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)
		) {
			console.log('dark mode triggered');
			document.documentElement.classList.remove('dark');
			darkMode = false;
			dark_mode_store.set(false);
		} else {
			document.documentElement.classList.add('dark');
			darkMode = true;
			dark_mode_store.set(true);
		}
	}

	function getSidebarOpenPercentage() {
		if (window.innerWidth >= 640) {
			return 0.55;
		} else {
			return 0.33;
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

	let style: string | undefined = darkMode
		? 'mapbox://styles/kylerschin/clm2i6cmg00fw01of2vp5h9p5'
		: 'mapbox://styles/kylerschin/cllpbma0e002h01r6afyzcmd8';

	if (typeof window != 'undefined') {
		let desiredStyle = embedmode
			? urlParams.get('framework-style') || window.localStorage.mapStyle
			: window.localStorage.mapStyle;

		if (desiredStyle == '3d') {
			style = undefined;
		}
		if (desiredStyle == 'sat') {
			style = 'mapbox://styles/kylerschin/clncqfm5p00b601recvp14ipu';
		}
		if (desiredStyle == 'rustic') {
			style = 'mapbox://styles/kylerschin/clrgqjvqm005m01oo661z8v1e';
		}
		if (desiredStyle == 'deepsea') {
			style = darkMode
				? 'mapbox://styles/kylerschin/clqogkdiy00bs01obh352h32o'
				: 'mapbox://styles/kylerschin/clqomei1n006h01raaylca7ty';
		}
		if (desiredStyle == 'archi') {
			style = 'mapbox://styles/kylerschin/clqpdas5u00c801r8anbdf6xl';
		}
		if (desiredStyle == 'minimal') {
			style = 'mapbox://styles/kylerschin/clqpxwqw700bs01rjej165jc7';
		}
	}

	function recompute_map_padding() {
		if (innerWidth < 640) {
			let padding = {"bottom": document.getElementById('catenary-sidebar')?.offsetHeight};
			mapglobal.easeTo({padding: padding, duration: 200});
		} else {
			if (innerWidth < 768) {
				let padding = {"left": document.getElementById('catenary-sidebar')?.offsetWidth};
				mapglobal.easeTo({padding: padding, duration: 200});
			} else {
				if (sidebarOpen == 'full') {
					let padding = {"left": document.getElementById('catenary-sidebar')?.offsetWidth};
					mapglobal.easeTo({padding: padding, duration: 200});
				} else {
					let padding = {"left": 0};
					mapglobal.easeTo({padding: padding, duration: 200});
				}
			}
		}
	}

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
		if (sidebarOpen == "full") {
			sidebarOpen = "full";
		} else {
			if (window.innerWidth < 768) {
			sidebarOpen = 'middle';
		} else {
			sidebarOpen = 'full';
		}
		}

		moveToPos({});
	}

	function moveToPos(values: any) {
		last_sidebar_release = performance.now();

		let sidebar_width = document.getElementById('catenary-sidebar')?.offsetWidth || 0;

		if (last_sidebar_interval_id != null) {
			clearInterval(last_sidebar_interval_id);
		}

		recompute_map_padding();

		last_sidebar_interval_id = setInterval(() => {
			if (window.innerWidth < 768) {
				translate_x_sidebar_number = 0;
				translate_x_sidebar = '0px';
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
			} else {
				console.log('desktop sidebar action')
				if (sidebarOpen == "full") {
					if (translate_x_sidebar_number < -0.001) {
							translate_x_sidebar_number += 0.1 * Math.abs(translate_x_sidebar_number);
							console.log('grow to ', translate_x_sidebar_number)
							translate_x_sidebar = `${translate_x_sidebar_number}px`;
							
							collapser_left_offset_number = sidebar_width - Math.abs(translate_x_sidebar_number);
							collapser_left_offset = `${collapser_left_offset_number}px`;
					} else {
						clearInterval(last_sidebar_interval_id);
					}
				}

				if (sidebarOpen == "none") {
					if (translate_x_sidebar_number > 0 - sidebar_width) {
							translate_x_sidebar_number -= 0.1 * Math.abs(sidebar_width);
							
						console.log('shrink to ', translate_x_sidebar_number, 'target', 0 - sidebar_width);

							translate_x_sidebar = `${translate_x_sidebar_number}px`;
							
							collapser_left_offset_number -= 0.1 * Math.abs(sidebar_width);
							collapser_left_offset = `${collapser_left_offset_number}px`;
					} else {
						clearInterval(last_sidebar_interval_id);
					}
				}
			}
		}, 1);
	}

	function letgosidebar(e: Event) {
		recompute_map_padding();
		moveToPos({ event: e });
	}

	function gonorth() {
		if (mapglobal) {
			lasttimeofnorth = performance.now();
			mapglobal.resetNorth();
		}
	}

	function gpsbutton() {
		if (geolocation) {
			if (mapglobal) {
				let target: any = {
					center: [geolocation.coords.longitude, geolocation.coords.latitude],
					essential: true // this animation is considered essential with respect to prefers-reduced-motion
				};

				if (firstmove === false || lockongps === true) {
					target.zoom = lockonconst;
					secondrequestlockgps = true;
				}

				lock_on_gps_store.set(true);

				mapglobal.flyTo(target);
			}
		}
	}

	function gpsupdate() {
		if (geolocation) {
			if (mapglobal) {
				//get url param pos
				let emptyhash = !window.location.hash.includes('pos');

				if (lockongps === true || (firstmove === false && emptyhash === true)) {
					let target: any = {
						center: [geolocation.coords.longitude, geolocation.coords.latitude],
						essential: true // this animation is considered essential with respect to prefers-reduced-motion
					};

					if (lasttimeofnorth > performance.now() - 6000) {
						target.bearing = 0;
					}

					if (secondrequestlockgps === true || firstmove === false) {
						target.zoom = lockonconst;
					}

					if (firstmove === false) {
						lock_on_gps_store.set(true);
						secondrequestlockgps = true;
					}

					mapglobal.easeTo(target, { duration: 500 });
				}
			}
		}
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

			recompute_map_padding();
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

	onMount(() => {
		fetch('https://birch.catenarymaps.org/getchateaus')
			.then(function (response) {
				return response.json();
			})
			.then(function (json) {
				chateaus = json;

				json.features.forEach((feature: any) => {
					const this_realtime_feeds_list: string[] = feature.properties.realtime_feeds;
					const this_schedule_feeds_list: string[] = feature.properties.schedule_feeds;

					this_realtime_feeds_list.forEach((realtime) => {
						feed_id_to_chateau_lookup[realtime] = feature.properties.chateau;
					});

					chateau_to_realtime_feed_lookup[feature.properties.chateau] = this_realtime_feeds_list;

					this_schedule_feeds_list.forEach(
						(sched) => (feed_id_to_chateau_lookup[sched] = feature.properties.chateau)
					);
				});
			})
			.catch((err) => console.error(err));

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

		if (darkMode) {
			map.on('style.load', () => {
				// @ts-expect-error
				map.setConfigProperty('basemap', 'lightPreset', 'night');
				// @ts-expect-error
				map.setConfigProperty('basemap', 'showTransitLabels', false);
			});
		}

		mapboxgl.setRTLTextPlugin(
			'/mapbox-gl-rtl-text.min.js',
			(err) => {
				console.error(err);
			},
			true // Lazy load the plugin
		);

		mapglobal = map;

		//updates the debug window with the current map lng and lat
		function updateData() {
			mapzoom = map.getZoom();
			maplng = map.getCenter().lng;
			maplat = map.getCenter().lat;

			current_map_heading = map.getBearing();
		}

		setup_click_handler(map, layerspercategory, setSidebarOpen);

		map.on('move', (events) => {
			updateData();
			lock_on_gps_store.set(false);
		});

		map.on('moveend', (events) => {
			let chateau_feed_results = determineFeedsUsingChateaus(map);
			chateaus_in_frame.set(Array.from(chateau_feed_results.chateaus));
		});

		map.on('touchmove', (events) => {
			lasttimeofnorth = 0;
		});

		map.on('mousemove', (events) => {
			lasttimeofnorth = 0;
		});

		map.on('renderstart', (event) => {
			last_render_start = performance.now();
		});

		map.on('render', (event) => {
			frame_render_duration = performance.now() - last_render_start;

			fps_array.push(performance.now());

			fps_array = fps_array.filter((x) => x > performance.now() - 1000);

			if (fps_array.length > 2) {
				fps = fps_array.length / ((fps_array[fps_array.length - 1] - fps_array[0]) / 1000);
			} else {
				fps = 0;
			}
		});

		map.on('zoomend', (events) => {
			let chateau_feed_results = determineFeedsUsingChateaus(map);
			chateaus_in_frame.set(Array.from(chateau_feed_results.chateaus));
		});

		const successCallback = (position: any) => {
			//console.log(position);

			let location = position;

			if (location) {
				//console.log('set geo to ', JSON.stringify({...location}));

				//console.log('coords', location.coords.longitude, location.coords.latitude);

				localStorage.setItem(
					'cachegeolocation',
					`${location.coords.longitude},${location.coords.latitude}`
				);

				geolocation = location;

				let geolocationdata = map.getSource('geolocation');

				if (geolocationdata) {
					geolocationdata.setData({
						type: 'FeatureCollection',
						features: [
							{
								type: 'Feature',
								geometry: {
									type: 'Point',
									coordinates: [location.coords.longitude, location.coords.latitude]
								},
								properties: {
									accuracy: location.coords.accuracy,
									heading: location.coords.heading
								}
							}
						]
					});

					setUserCircles(map, location.coords.longitude, location.coords.latitude);

					if (location.coords.accuracy) {
						let accuracyLayer = map.getSource('userpositionacc');

						if (accuracyLayer) {
							let numberofpoints: number = 128;

							let geojsondata: any = createGeoJSONCircle(
								[location.coords.longitude, location.coords.latitude],
								location.coords.accuracy / 1000,
								numberofpoints
							);

							geojsondata.features[0].properties.opacity = 0.2;

							if (location.coords.accuracy >= 1000) {
								geojsondata.features[0].properties.opacity = 0.1;
							}

							if (location.coords.accuracy >= 2000) {
								geojsondata.features[0].properties.opacity = 0.05;
							}

							if (location.coords.accuracy >= 5000) {
								geojsondata.features[0].properties.opacity = 0.02;
							}

							accuracyLayer.setData(
								geojsondata,
								location.coords.longitude,
								location.coords.latitude
							);
						}
					}
				}

				let nobearingposlayer = map.getLayer('nobearing_position');
				let bearingposlayer = map.getLayer('bearing_position');

				if (false) {
					console.log('bearing is', location.coords.heading);

					map.setLayoutProperty('nobearing_position', 'visibility', 'none');

					map.setLayoutProperty('bearing_position', 'visibility', 'visible');
				} else {
					if (nobearingposlayer) {
						map.setLayoutProperty('nobearing_position', 'visibility', 'visible');
					}

					if (bearingposlayer) {
						map.setLayoutProperty('bearing_position', 'visibility', 'none');
					}
				}

				gpsupdate();
			}
		};

		const errorCallback = (error: any) => {
			console.log(error);
		};

		if (typeof window !== 'undefined') {
			// client-only code here
			const id = navigator.geolocation.watchPosition(successCallback, errorCallback, {
				enableHighAccuracy: true
			});
		}

		setup_load_map(
			map,
			runSettingsAdapt,
			showzombiebuses,
			darkMode,
			layerspercategory,
			chateaus_in_frame,
			layersettings,
			chateau_to_realtime_feed_lookup,
			pending_chateau_rt_request,
			recompute_map_padding
		);
	});
</script>

<svelte:head>
	<script>
		(function (w, d, s, l, i) {
			w[l] = w[l] || [];
			w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
			var f = d.getElementsByTagName(s)[0],
				j = d.createElement(s),
				dl = l != 'dataLayer' ? '&l=' + l : '';
			j.async = true;
			j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
			f.parentNode.insertBefore(j, f);
		})(window, document, 'script', 'dataLayer', 'GTM-WD62NKLX');
	</script>
	<!-- End Google Tag Manager -->
	<!-- Primary Meta Tags -->
	<title>Catenary Maps</title>
	<meta name="title" content="Catenary Maps" />
	<meta
		name="description"
		content="Realtime bus and train location tracking, stop times prediction, analysis, and routing algorithm calculations."
	/>
	<meta name="viewport" content="width=device-width, user-scalable=no" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Catenary Maps" />
	<meta
		property="og:description"
		content="Realtime bus and train location tracking, stop times prediction, analysis, and routing algorithm calculations."
	/>
	<meta property="og:image" content="https://catenarymaps.org/screenshot1.png" />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content="Catenary Maps" />
	<meta
		property="twitter:description"
		content="Realtime bus and train location tracking, stop times prediction, analysis, and routing algorithm calculations."
	/>
	<meta property="twitter:image" content="https://transitmap.kylerchin.com/screenshot1.png" />

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin={true} />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0"
	/>
</svelte:head>
<div class="w-full">
	<div id="map" class="fixed top-0 left-0 w-[100vw] h-[100vh]" />
	
	<div class="fixed shadow-sm dark:shadow-gray-600 hidden lg:block px-1 py-2 rounded-r-md bg-white dark:bg-slate-800 text-black dark:text-white"
	on:click={() => {
		if (sidebarOpen == "full") {
			sidebarOpen = "none";
			moveToPos({});
		} else {
			sidebarOpen = "full";
			moveToPos({});
		}
	}}
	on:keydown={() => {
		if (sidebarOpen == "full") {
			sidebarOpen = "none";
			moveToPos({});
		} else {
			sidebarOpen = "full";
			moveToPos({});
		}
	}}
	style={`left: ${collapser_left_offset}; top: ${typeof window != "undefined" ? (window.innerHeight /2) - 15 : 0}px;`}
	>{#if sidebarOpen == "none"}
	<span class="material-symbols-outlined block my-auto">
		arrow_right
		</span>
	{/if}
	{#if sidebarOpen == "full"}
	<span class="material-symbols-outlined block my-auto">
		arrow_left
		</span>
	{/if}
</div>

	{#key translate_x_sidebar}
	<div
		id="catenary-sidebar"
		style={`height: ${sidebar_height_output}; transform: translateX(${translate_x_sidebar});`}
		class="z-40 rounded-t-2xl md:rounded-none fixed bottom-0 shadow-sm dark:shadow-gray-600 w-full sm:w-2/5 md:h-full md:w-[380px] lg:w-[408px] bg-white dark:bg-slate-900 md:dark:bg-opacity-90 backdrop-blur-md md:bg-opacity-90 md:dark:backdrop-blur-md md:fixed md:left-0 md:top-0 md:bottom-0 text-black dark:text-white"
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
		{#key on_sidebar_trigger}
			<SidebarInternals {latest_item_on_stack} {darkMode} />
		{/key}
	</div>
	{/key}
</div>

<div class="fixed top-4 right-4 flex flex-col gap-y-2 pointer-events-none">
	<div
		on:click={togglelayerfeature}
		on:keypress={togglelayerfeature}
		class="!cursor-pointer bg-white z-10 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center"
	>
		<span
			class="!cursor-pointer material-symbols-outlined align-middle my-auto mx-auto select-none"
		>
			layers
		</span>
	</div>

	<div
		on:click={gonorth}
		on:keypress={gonorth}
		on:touchstart={gonorth}
		aria-label="Reset Map to North"
		class="bg-white z-10 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center"
	>
		<img
			src={current_map_heading < 7 && current_map_heading > -7
				? darkMode === true
					? '/icons/north.svg'
					: '/icons/light_north.svg'
				: '/icons/compass.svg'}
			class="h-7"
			style={`transform: rotate(${0 - current_map_heading}deg)`}
		/>
	</div>

	{#if !desktopapp}
		{#key sidebar_height_output}
		{#if typeof geolocation == 'object'}
		{#if typeof geolocation.coords == 'object'}
		{#if typeof geolocation.coords.speed == 'number'}
		<div
		class='leading-tight text-sm  md:text-base rounded-lg text-black bg-white dark:text-white border border-gray-500 dark:bg-slate-800 shadow-sm shadow-slate-400 dark:shadow-slate-700 px-1 py-0.5'
		style={`bottom: ${gpsbutton_bottom_offset_calc()}`}
		>
			<p class='leading-none'>
				{#if geolocation}
			{#if usunits}
			<span class='text-semibold'>{(
				2.23694 * geolocation.coords.speed
			).toFixed(2).split(".")[0]}</span>
			{:else}
			<span  class='text-semibold'>{(
				3.6 * geolocation.coords.speed
			).toFixed(2).split(".")[0]}</span>
			{/if}
			{#if ["fr", "de", "it", "es", "se"].includes(locale.split("-")[0])}
			<span>,</span>
			{:else}
			<span>.</span>
			{/if}
			{#if usunits}
			<span>{(
				2.23694 * geolocation.coords.speed
			).toFixed(1).split(".")[1]}</span>
			{:else}
			<span>{(
				3.6 * geolocation.coords.speed
			).toFixed(1).split(".")[1]}</span>
			{/if}
			{#if usunits}<br/>
			<span class="text-xs">mph</span>
			{:else}<br/>
			<span class="text-xs">km/h</span>
			{/if}
			{/if}
			</p>
		</div>
		{/if}
		{/if}
		{/if}
			<div
				on:click={gpsbutton}
				on:keydown={gpsbutton}
				on:touchstart={gpsbutton}
				style={`bottom: ${gpsbutton_bottom_offset_calc()}`}
				class="{lockongps
					? ' text-blue-500 dark:text-blue-300'
					: ' text-black dark:text-gray-50'} select-none bg-white text-gray-900 z-50 fixed right-4 h-16 w-16 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
			>
				<span class="material-symbols-outlined align-middle text-lg select-none">
					{#if lockongps == true}my_location{:else}location_searching{/if}
				</span>
			</div>
		{/key}
	{/if}
</div>

<div
	class="z-50 dark:shadow-slate-800 shadow-lg fixed bottom-0 w-full rounded-t-lg sm:w-fit sm:bottom-4 sm:right-4 bg-white dark:bg-gray-900 dark:text-gray-50 bg-opacity-90 dark:bg-opacity-90 sm:rounded-lg z-50 px-3 py-2 {layersettingsBox
		? ''
		: 'hidden'}"
>
	<div class="flex flex-row align-middle">
		<h2 class="font-bold text-gray-800 dark:text-gray-200">Layers</h2>
		<div class="ml-auto">
			<CloseButton
				onclose={() => {
					layersettingsBox = false;
				}}
				moreclasses=""
				parentclass=""
			/>
		</div>
	</div>
	<div class="rounded-xl mx-0 my-2 flex flex-row w-full text-black dark:text-white">
		<Layerselectionbox
			text={strings.headingIntercityRail}
			changesetting={() => {
				selectedSettingsTab = 'intercityrail';
			}}
			cssclass={`${
				selectedSettingsTab === 'intercityrail' ? enabledlayerstyle : disabledlayerstyle
			} w-1/2 py-1 px-1`}
		/>

		<Layerselectionbox
			text={strings.headingLocalRail}
			changesetting={() => {
				selectedSettingsTab = 'localrail';
			}}
			cssclass={`${
				selectedSettingsTab === 'localrail' ? enabledlayerstyle : disabledlayerstyle
			} w-1/2 py-1 px-1`}
		/>

		<Layerselectionbox
			text={strings.headingBus}
			changesetting={() => {
				selectedSettingsTab = 'bus';
			}}
			cssclass={`${
				selectedSettingsTab === 'bus' ? enabledlayerstyle : disabledlayerstyle
			} w-1/2 py-1 px-1`}
		/>

		<Layerselectionbox
			text={strings.headingOther}
			changesetting={() => {
				selectedSettingsTab = 'other';
			}}
			cssclass={`${
				selectedSettingsTab === 'other' ? enabledlayerstyle : disabledlayerstyle
			} w-1/2 py-1 px-1`}
		/>

		<div
			on:click={() => {
				selectedSettingsTab = 'more';
			}}
			on:keydown={() => {
				selectedSettingsTab = 'more';
			}}
			class={`${
				selectedSettingsTab === 'more' ? enabledlayerstyle : disabledlayerstyle
			} w-1/2 py-1 px-1`}
		>
			<p class="w-full align-center text-center">{strings.headingMisc}</p>
		</div>
	</div>

	{#if selectedSettingsTab === 'more'}
		<div class="flex flex-row gap-x-1">
			<Layerbutton
				bind:layersettings
				selectedSettingsTab="more"
				change="foamermode"
				nestedchange="infra"
				name={strings.orminfra}
				urlicon="https://b.tiles.openrailwaymap.org/standard/14/2866/6611.png"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				selectedSettingsTab="more"
				change="foamermode"
				nestedchange="maxspeed"
				name={strings.ormspeeds}
				urlicon="https://b.tiles.openrailwaymap.org/maxspeed/14/2866/6611.png"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				selectedSettingsTab="more"
				change="foamermode"
				nestedchange="signalling"
				name={strings.ormsignalling}
				urlicon="https://b.tiles.openrailwaymap.org/signals/14/2866/6611.png"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				selectedSettingsTab="more"
				change="foamermode"
				nestedchange="electrification"
				name={strings.ormelectrification}
				urlicon="https://b.tiles.openrailwaymap.org/electrification/14/2866/6611.png"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				selectedSettingsTab="more"
				change="foamermode"
				nestedchange="gauge"
				name={strings.ormgauge}
				urlicon="https://b.tiles.openrailwaymap.org/gauge/14/2866/6611.png"
				{runSettingsAdapt}
			/>
			<Layerbutton
				bind:layersettings
				selectedSettingsTab="more"
				change="foamermode"
				nestedchange="dummy"
				name={strings.none}
				urlicon="https://b.tiles.openrailwaymap.org/standard/3/2/1.png"
				{runSettingsAdapt}
			/>
		</div>

		<div>
			<input
				on:click={(x) => {
					showzombiebuses = !showzombiebuses;

					localStorage.setItem('showzombiebuses', String(showzombiebuses));

					runSettingsAdapt();
				}}
				on:keydown={(x) => {
					showzombiebuses = !showzombiebuses;

					localStorage.setItem('showzombiebuses', String(showzombiebuses));

					runSettingsAdapt();
				}}
				checked={showzombiebuses}
				id="show-zombie-buses"
				type="checkbox"
				class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
			/>
			<label for="show-zombie-buses" class="ml-2">{strings.showtripless}</label>
		</div>
	{/if}

	{#if ['other', 'bus', 'intercityrail', 'localrail'].includes(selectedSettingsTab)}
		<div class="flex flex-row gap-x-1">
			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="shapes"
				name={strings.routes}
				urlicon="/routesicon.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="labelshapes"
				name={strings.labels}
				urlicon="/labelsicon.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="stops"
				name={strings.stops}
				urlicon="/stopsicon.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="stoplabels"
				name={strings.stopnames}
				urlicon={darkMode ? '/dark-stop-name.png' : '/light-stop-name.png'}
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="visible"
				name={strings.vehicles}
				urlicon="/vehiclesicon.svg"
				{runSettingsAdapt}
			/>
		</div>
		<div class="flex flex-row gap-x-1">
			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="route"
				name={strings.showroute}
				symbol="route"
				{runSettingsAdapt}
			/>
			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="trip"
				name={strings.showtrip}
				symbol="mode_of_travel"
				{runSettingsAdapt}
			/>
			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="vehicle"
				name={strings.showvehicle}
				symbol="train"
				{runSettingsAdapt}
			/>

			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="headsign"
				name="Headsign"
				symbol="sports_score"
				{runSettingsAdapt}
			/>

			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="speed"
				name={strings.showspeed}
				symbol="speed"
				{runSettingsAdapt}
			/>
		</div>
	{/if}
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
