<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';
	import { writable, get } from 'svelte/store';
	import type { Writable } from 'svelte/store';
	import Realtimelabel from '../realtimelabel.svelte';
	import { createGeoJSONCircle, componentToHex } from '../geoMathsAssist';
	import SidebarInternals from '../components/sidebarInternals.svelte';
	import { init_locales } from '../i18n';
	import { _ } from 'svelte-i18n';
	import { isLoading } from 'svelte-i18n';
	import { update_geolocation_source } from '../user_location_lib';
	import {init_stores} from '../components/init_stores';
	import {refreshUIMaplibre} from '../components/transitionDarkAndLight';
	import {layerspercategory } from '../components/layernames';

	import {
		data_stack_store,
		on_sidebar_trigger_store,
		realtime_vehicle_locations_last_updated_store,
		realtime_vehicle_locations_store,
		realtime_vehicle_route_cache_hash_store,
		realtime_vehicle_route_cache_store,
		lock_on_gps_store,
		usunits_store,
		show_zombie_buses_store,
		show_my_location_store,
		custom_icons_category_to_layer_id,
		map_pointer_store,
		geolocation_store,
		chateaus_store,
		show_gtfs_ids_store,
		ui_theme_store
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
	import { setup_load_map } from '../components/setup_load_map';
	import { interpretLabelsToCode } from '../components/rtLabelsToMapboxStyle';
	import { locale, locales } from 'svelte-i18n';
	import { determineFeedsUsingChateaus } from '../maploaddata';
	import CloseButton from '../components/CloseButton.svelte';
	import Layerselectionbox from '../components/layerselectionbox.svelte';
	import { determineDarkModeToBool } from '../components/determineDarkModeToBool';

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
	init_locales();
	init_stores();
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
	let current_locale: string = 'default';
	locale.subscribe((value) => {
		if (typeof window != 'undefined') {
			window.localStorage.language = value;
		}
	});
	let last_sidebar_interval_id: number | null = null;
	let previous_click_on_sidebar_dragger: number | null = null;
	let previous_y_velocity_sidebar: number | null = null;
	let layersettingsBox = false;
	const layersettingsnamestorage = 'layersettingsv4';
	let currently_holding_sidebar_grabber: boolean = false;
	let maplat: number, maplng: number, mapzoom: number;
	let translate_x_sidebar: string = '0px';
	let translate_x_sidebar_number: number = 0;
	let collapser_left_offset_number: number = 380;
	let collapser_left_offset: string = '380px';
	let top_margin_collapser_sidebar: string = '0px';

	let geolocation: GeolocationPosition | null;

	geolocation_store.subscribe((g) => {
		geolocation = g;
	});

	let darkMode = determineDarkModeToBool();
	let lockongps = false;

	lock_on_gps_store.subscribe((value) => {
		lockongps = value;
	});

	const lockonconst = 14.5;
	let firstmove = false;
	let secondrequestlockgps = false;


	if (typeof window !== 'undefined') {
		top_margin_collapser_sidebar = `${window.innerHeight / 2 - 15}px`;

		if (window.localStorage.language) {
			locale.set(window.localStorage.language);
		}

		window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change',({ matches }) => {
		let ui_theme_grab = get(ui_theme_store);

		if (ui_theme_grab == "system") {
			if (matches) {
    console.log("change to dark mode!");
	darkMode = true;
	refreshUIMaplibre();
  } else {
	console.log("change to light mode!");

	darkMode = false;

	refreshUIMaplibre();
  }
		} 
});

		if (ui_theme_store) {

			let ui_theme_grab = get(ui_theme_store);

			if (ui_theme_grab == "system") {
					const checkIsDarkSchemePreferred = () => window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ?? false;

					darkMode = checkIsDarkSchemePreferred();
				}
				else if (ui_theme_grab == "dark") {
					darkMode = true;
				} else {
					darkMode = false;
				}

				if (darkMode) {
					document.body.classList.add('dark');
				} else {
					document.body.classList.remove('dark');
				}

			ui_theme_store.subscribe((value) => {
				if (value == "system") {
					const checkIsDarkSchemePreferred = () => window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ?? false;

					darkMode = checkIsDarkSchemePreferred();
				}
				else if (value == "dark") {
					darkMode = true;
				} else {
					darkMode = false;
				}

				if (darkMode) {
					document.body.classList.add('dark');
				} else {
					document.body.classList.remove('dark');
				}

				refreshUIMaplibre();
			});

			console.log('dark mode ', darkMode, 'sytstem theme', ui_theme_grab);
			
		}
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

	function skyRefresh(map: maplibregl.Map, darkMode: boolean) {
		if (darkMode) {
			map.setSky({
				"sky-color": "#000000",
                            "sky-horizon-blend": 1,
                            "horizon-color": "#ffffff",
                            "horizon-fog-blend": .5,
                    "fog-ground-blend": .5,
					"atmosphere-blend": [
						"interpolate",
						["linear"],
						["zoom"],
						2,
						0.4,
						7,
						0.1,
						9,
						0
					]
			});
		} else {
			map.setSky({
				"sky-color": "#199EF3", // the color of the sky
     "sky-horizon-blend": 1, // a value between 0 and 1. 0 is the horizon, 1 is map-height / 2
     "horizon-color": "#ffffff", // the second sky color at the horizon, default is sky-color
     "horizon-fog-blend": 1, // with a value from 0 to 1. 0 is no blend, 1 is blend to height/2 (e.g. max visible sky at max pitch)
     "fog-color": "#0000ff", // the color of the fog
     "fog-ground-blend": 1, // with a value from 0 to 1. 0 is the map-center, 1 is the far-clipping-plane. This setting works only in 3d-mode, also fog is faded out when lowering pitch and disappears below pitch 60
     "atmosphere-blend": ["interpolate", // interpolate the atmosphere blend using expressions
          ["linear"],
          ["zoom"],
          0,0, // z0 - 1 - fully visible atmosphere
          10,0.1, // z10 - 1 - fully visible atmosphere
          12,0 // z12 - 0 - no atmosphere
          ],
     
			});

			
		}
	}

	let mapglobal: maplibregl.Map | null = null;

	const urlParams =
		typeof window !== 'undefined'
			? new URLSearchParams(window.location.search)
			: new URLSearchParams();
	let debugmode = !!urlParams.get('debug');

	let fpsmode = !!urlParams.get('fps');

	let embedmode = urlParams.get('framework') == 'true';

	let desktopapp = urlParams.get('desktop') == 'true';
	let mobileapp = urlParams.get('utm_source') == 'pwa';

	let markLoadInPoint = urlParams.get('mp') == 'true' || urlParams.get('framework-point') == 'true';
	let markedPointCoords: number[];

	let showzombiebuses = false;

	show_zombie_buses_store.subscribe((value) => {
		showzombiebuses = value;
	});

	let show_my_location = true;

	show_my_location_store.subscribe((value) => {
		show_my_location = value;
	});

	if (typeof window != 'undefined') {
		let cached_show_my_location_settings = localStorage.getItem('show-my-location');

		if (cached_show_my_location_settings == 'false') {
			show_my_location_store.set(false);
		}

		let cached_show_zombie_buses_settings = localStorage.getItem('showzombiebuses');

		if (cached_show_zombie_buses_settings == 'true') {
			show_zombie_buses_store.set(true);
		}

		if (markLoadInPoint) {
			markedPointCoords = window.location.hash
				.replace('#pos=', '')
				.split('/')
				.map((x) => parseFloat(x));
		}
	}

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

	let layersettings: Record<string, any> = {
		bus: {
			visible: true,
			labelshapes: false,
			stops: true,
			shapes: true,
			stoplabels: false,
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
			labelshapes: false,
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
			labelshapes: false,
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
			labelshapes: false,
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
			
			if (show_my_location) {
					if (mapglobal.getLayer('nobearing_position')) {
						
				mapglobal.setLayoutProperty('nobearing_position', 'visibility', 'visible');
					}

				if (mapglobal.getLayer('geolocationheadingshell')) {
					mapglobal.setLayoutProperty('geolocationheadingshell', 'visibility', 'visible');
				}

				if (mapglobal.getLayer('km_text')) {
					mapglobal.setLayoutProperty('km_text', 'visibility', 'visible');
				}

				if (mapglobal.getLayer('km_line')) {
					mapglobal.setLayoutProperty('km_line', 'visibility', 'visible');
				}

				if (mapglobal.getLayer('userpositionacclayer')) {
					mapglobal.setLayoutProperty('userpositionacclayer', 'visibility', 'visible');
				}
			} else {
				if (mapglobal.getLayer('geolocationheadingshell')) {
					mapglobal.setLayoutProperty('geolocationheadingshell', 'visibility', 'none');
				}

				if (mapglobal.getLayer('km_text')) {
					mapglobal.setLayoutProperty('km_text', 'visibility', 'none');
				}

				if (mapglobal.getLayer('km_line')) {
					mapglobal.setLayoutProperty('km_line', 'visibility', 'none');
				}

				if (mapglobal.getLayer('nobearing_position')) {
					mapglobal.setLayoutProperty('nobearing_position', 'visibility', 'none');
				}

				if (mapglobal.getLayer('userpositionacclayer')) {
					mapglobal.setLayoutProperty('userpositionacclayer', 'visibility', 'none');
				}
			}

			if (mapglobal.getLayer('foamershapes')) {
				
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
					console.error('could not fetch shapes layer', category);
				}

				let stoplayer = mapglobal.getLayer(categoryvalues.stops);
				if (stoplayer) {
					if (category == "localrail") {
						if (this_layer_settings.stops) {
							mapglobal.setLayoutProperty("tramstops", 'visibility', 'visible');
						} else {
							mapglobal.setLayoutProperty("tramstops", 'visibility', 'none');
						}
					}

					if (this_layer_settings.stops) {
						mapglobal.setLayoutProperty(categoryvalues.stops, 'visibility', 'visible');
					} else {
						mapglobal.setLayoutProperty(categoryvalues.stops, 'visibility', 'none');
					}
				} else {
					console.error('no stop layer found for', category);
				}

				let stopslabellayer = mapglobal.getLayer(categoryvalues.labelstops);
				if (stopslabellayer) {
					if (category == "localrail") {
						if (this_layer_settings.stoplabels) {
							mapglobal.setLayoutProperty("tramstopslabel", 'visibility', 'visible');
						} else {
							mapglobal.setLayoutProperty("tramstopslabel", 'visibility', 'none');
						}
					}

					if (this_layer_settings.stoplabels) {
						mapglobal.setLayoutProperty(categoryvalues.labelstops, 'visibility', 'visible');
					} else {
						mapglobal.setLayoutProperty(categoryvalues.labelstops, 'visibility', 'none');
					}
				} else {
					console.error('no stops label layer found for ', category);
				}

				

				let dotcirclelayer = mapglobal.getLayer(categoryvalues.livedots);
				let dotlabel = mapglobal.getLayer(categoryvalues.labeldots);

				[categoryvalues.pointing, categoryvalues.pointingshell, categoryvalues.labeldots, categoryvalues.livedots].forEach((x) => {
							if (mapglobal?.getLayer(x)) {
								let resulting_vis = this_layer_settings.visible ? 'visible' : 'none';
								mapglobal.setLayoutProperty(x, 'visibility', resulting_vis);
							} else {
								console.error('could not find layer', x);
							}
						});

						mapglobal.setLayoutProperty(
							categoryvalues.labeldots,
							'text-field',
							interpretLabelsToCode(this_layer_settings.label, usunits)
						);

				let hidevehiclecommand = ['!=', '', ['get', 'trip_id']];

				let regularpointers = [
					'all',
					['!=', 0, ['get', 'bearing']],
					['==', true, ['get', 'has_bearing']]
				];
				let hidevehiclecommandpointers = [
					'all',
					['!=', '', ['get', 'trip_id']],
					['!=', 0, ['get', 'bearing']],
					['==', true, ['get', 'has_bearing']]
				];

				if (dotcirclelayer && mapglobal) {
					if (showzombiebuses === true) {
						if (mapglobal.getLayer(categoryvalues.livedots)) {
							mapglobal.setFilter(categoryvalues.livedots, undefined);
							mapglobal.setFilter(categoryvalues.labeldots, undefined);
						
						}
						if (mapglobal.getLayer(categoryvalues.pointing)) {
							mapglobal.setFilter(categoryvalues.pointing, regularpointers);
							mapglobal.setFilter(categoryvalues.pointingshell, regularpointers);
						}
					} else {
						if (mapglobal.getLayer(categoryvalues.livedots)) {
							mapglobal.setFilter(categoryvalues.livedots, hidevehiclecommand);
							mapglobal.setFilter(categoryvalues.labeldots, hidevehiclecommand);
						}

						if (mapglobal.getLayer(categoryvalues.pointing)) {
							mapglobal.setFilter(categoryvalues.pointing, hidevehiclecommandpointers);
							mapglobal.setFilter(categoryvalues.pointingshell, hidevehiclecommandpointers);
						}
				}
			}});

			localStorage.setItem(layersettingsnamestorage, JSON.stringify(layersettings));

			//handle custom icons
			let get_custom_icons_category_to_layer_id = get(custom_icons_category_to_layer_id);

			Object.entries(get_custom_icons_category_to_layer_id).forEach((x) => {
				let category = x[0];
				x[1].forEach((layer_id) => {
					let layer = mapglobal.getLayer(layer_id);

					if (layer) {
						if (layersettings[category].visible) {
							mapglobal.setLayoutProperty(layer_id, 'visibility', 'visible');
							console.log('set', layer_id, 'to show');
						} else {
							mapglobal.setLayoutProperty(layer_id, 'visibility', 'none');
							console.log('hide', layer_id);
						}
					}
				});
			});

			true;
		}
	}

	if (typeof window != 'undefined') {
		let fetchitem =
			(embedmode && urlParams.get('framework-layers')
				? atob(urlParams.get('framework-layers') as string)
				: null) || localStorage.getItem(layersettingsnamestorage);
		if (fetchitem != null) {
			let cachedJsonObject = JSON.parse(fetchitem);

			if (cachedJsonObject != null) {
				layersettings = cachedJsonObject;
			}
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

	let style: string = darkMode
		? '/dark-style.json'
		: '/light-style.json';

	function recompute_map_padding() {
		if (innerWidth < 640) {
			let padding = { bottom: document.getElementById('catenary-sidebar')?.offsetHeight, left: 0 };
			mapglobal.easeTo({ padding: padding, duration: 200 });
		} else {
			if (innerWidth < 768) {
				let padding = { left: document.getElementById('catenary-sidebar')?.offsetWidth, bottom: 0 };
				mapglobal.easeTo({ padding: padding, duration: 200 });
			} else {
				if (sidebarOpen == 'full') {
					let padding = {
						left: document.getElementById('catenary-sidebar')?.offsetWidth,
						bottom: 0
					};
					mapglobal.easeTo({ padding: padding, duration: 200 });
				} else {
					let padding = { left: 0 };
					mapglobal.easeTo({ padding: padding, duration: 200 });
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
		if (sidebarOpen == 'full') {
			sidebarOpen = 'full';
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
					sidebar_height_number += 0.15 * (target - sidebar_height_number);
					sidebar_height_output = sidebar_height_number + 'px';
				} else {
					if (sidebar_height_number > target) {
						sidebar_height_number -= 0.15 * (sidebar_height_number - target);
						sidebar_height_output = sidebar_height_number + 'px';
					} else {
						clearInterval(last_sidebar_interval_id);
					}
				}
			} else {
				if (sidebarOpen == 'full') {
					if (translate_x_sidebar_number < -0.001) {
						translate_x_sidebar_number += 0.1 * Math.abs(translate_x_sidebar_number);
						translate_x_sidebar = `${translate_x_sidebar_number}px`;

						collapser_left_offset_number = sidebar_width - Math.abs(translate_x_sidebar_number);
						collapser_left_offset = `${collapser_left_offset_number}px`;
					} else {
						clearInterval(last_sidebar_interval_id);
					}
				}

				if (sidebarOpen == 'none') {
					if (translate_x_sidebar_number > 0 - sidebar_width) {
						translate_x_sidebar_number -= 0.1 * Math.abs(sidebar_width);

						translate_x_sidebar = `${translate_x_sidebar_number}px`;

						collapser_left_offset_number -= 0.1 * Math.abs(sidebar_width);
						collapser_left_offset = `${collapser_left_offset_number}px`;
					} else {
						clearInterval(last_sidebar_interval_id);
					}
				}
			}
		}, 0.5);
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
			top_margin_collapser_sidebar = `${window.innerHeight / 2 - 15}px`;

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
			if (currently_holding_sidebar_grabber) {
				console.log('sidebar touchmove', e);
				mousemovesidebar(e);
			}
		});

		addEventListener('mousemove', (e) => {
			if (currently_holding_sidebar_grabber) {
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
		}

		addEventListener('touchend', (e) => {
			if (currently_holding_sidebar_grabber) {
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
		//#region On the fly IP geolocation

		if (localStorage.getItem('cachegeolocation')) {
			const [long, lat] = localStorage.getItem('cachegeolocation')!.split(',');
			centerinit = [parseFloat(long), parseFloat(lat)];
			if (mapglobal) {
				mapglobal.setCenter(centerinit);
				mapglobal.setZoom(14);
			}
		} else {
			try {
				/**
				 * Use GeoLite2 database on Catenary servers
				 *
				 * adding a pin with this provided lat/long would prob freak a few people out
				 * and even mapping sites (google, bing, etc) don't do it either on default
				 * -q
				 */
				fetch('https://birch.catenarymaps.org/ip_addr_to_geo/')
					.then((response) => response.json())
					// the text will be `lat,long`
					.then((geo_api_response) => {
						if (geo_api_response.geo_resp) {
							centerinit = [
								parseFloat(geo_api_response.geo_resp.longitude),
								parseFloat(geo_api_response.geo_resp.latitude)
							];

							// set the center of the map to the user's location
							// in case the map is already initialized (rare), set the center to the user's location
							if (mapglobal) {
								mapglobal.setCenter(centerinit);
							}

							// store the user's location in localStorage, as we do with regular browser provided geolocation
							/*localStorage.setItem(
								'cachegeolocation',
								`${geo_api_response.geo_resp.longitude},${geo_api_response.geo_resp.latitude}`
							);*/
						}
					});
			} catch (e) {
				console.error('Failed to get IP location, defaulting to LA');
			}
		}

		// #endregion

		// https://raw.githubusercontent.com/catenarytransit/betula-celtiberica-cdn/refs/heads/main/data/chateaus.json
		// https://birch.catenarymaps.org/getchateaus
		fetch('https://raw.githubusercontent.com/catenarytransit/betula-celtiberica-cdn/refs/heads/main/data/chateaus.json')
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

				let chateaus_source = mapglobal.getSource('chateaus');

				if (chateaus_source) {
					chateaus_source.setData(json);
				}

				chateaus_store.set(json);
			})
			.catch((err) => console.error(err));

		
		const map = new maplibregl.Map({
          container: 'map',
		  light: {"anchor": "viewport", "color": "white", "intensity": 0.4},
		  hash: 'pos',
		  pixelRatio: window.devicePixelRatio * 1.4,
          style: style, // stylesheet location
		  center: centerinit, // starting position [lng, lat]
		  zoom: zoominit, // starting zoom (must be greater than 8.1)
        });

		let remove = null;

		const updatePixelRatio = () => {
			map.setPixelRatio(window.devicePixelRatio * 1.4);

  if (remove != null) {
    remove();
  }
}
const mqString = `(resolution: ${window.devicePixelRatio}dppx)`;
const media = matchMedia(mqString);
  media.addEventListener("change", updatePixelRatio);
  remove = () => {
    media.removeEventListener("change", updatePixelRatio);
  };

		//map tile bounds

		if (urlParams.get('tilebounds')) {
			  map.showTileBoundaries = true;
			//  map.showParseStatus = true;
		}

		map_pointer_store.set(map);

		if (markedPointCoords) {
			new maplibregl.Marker().setLngLat([markedPointCoords[2], markedPointCoords[1]]).addTo(map);
		}

		if (darkMode) {
		
		}

		map.on('load', () => {
			map.setProjection({type: 'globe'});
			skyRefresh(map, darkMode);

			map.addSource('hillshade',
				{
					type: 'raster-dem',
				url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=B265xPhJaYe2kWHOLHTG'
				}
			)

			map.addLayer({
				id: 'hillshade',
				type: 'hillshade',
				source: 'hillshade',
				
				paint: { 'hillshade-shadow-color': darkMode ? '#050511' : '#111111',
					'hillshade-highlight-color': darkMode ? '#aaaaaa' : '#dddddd',
					'hillshade-accent-color': darkMode ? '#000000' : '#222222',
					"hillshade-exaggeration": 0.3
				  },
				  layout: {
					
				  }
			}, "aeroway_fill")

			setTimeout(() => {
				let chateau_feed_results = determineFeedsUsingChateaus(map);
				chateaus_in_frame.set(Array.from(chateau_feed_results.chateaus));

				runSettingsAdapt();
			}, 0);

			setTimeout(() => {
				runSettingsAdapt()
			}, 1000);
		});

		maplibregl.setRTLTextPlugin(
        '/mapbox-gl-rtl-text.min.js',
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

		map.on('zoomend', (events) => {
			let chateau_feed_results = determineFeedsUsingChateaus(map);
			chateaus_in_frame.set(Array.from(chateau_feed_results.chateaus));
		});

		console.log("setting up load map")

		setup_load_map(
			map,
			runSettingsAdapt,
			darkMode,
			layerspercategory,
			chateaus_in_frame,
			layersettings,
			chateau_to_realtime_feed_lookup,
			pending_chateau_rt_request,
			recompute_map_padding
		);

		console.log("setting up click handler")

		setup_click_handler(map, layerspercategory, setSidebarOpen);
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
	<!-- Cloudflare Web Analytics -->
	<script
		defer
		src="https://static.cloudflareinsights.com/beacon.min.js"
		data-cf-beacon={`{"token": "54830a433cbe4c08881b7f4d4692d822"}`}
	></script>
	<!-- End Cloudflare Web Analytics -->
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
	<link
		href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>
<div class="w-full">
	<div id="map" class="fixed top-0 left-0 w-[100vw] h-[100vh]" />

	{#key top_margin_collapser_sidebar}
		<div
			class="fixed hidden md:flex p-1 flex items-center rounded-r-md bg-white dark:bg-darksky text-black dark:text-white"
			on:click={() => {
				if (sidebarOpen == 'full') {
					sidebarOpen = 'none';
					moveToPos({});
				} else {
					sidebarOpen = 'full';
					moveToPos({});
				}
			}}
			on:keydown={() => {
				if (sidebarOpen == 'full') {
					sidebarOpen = 'none';
					moveToPos({});
				} else {
					sidebarOpen = 'full';
					moveToPos({});
				}
			}}
			style={`left: ${collapser_left_offset}; top: ${top_margin_collapser_sidebar};`}
		>
			{#if sidebarOpen == 'none'}
				<span class="material-symbols-outlined block my-auto"> chevron_right </span>
			{/if}
			{#if sidebarOpen == 'full'}
				<span class="material-symbols-outlined block my-auto"> chevron_left </span>
			{/if}
		</div>
	{/key}

	{#if !$isLoading}
		<div
			id="catenary-sidebar"
			style="height: {sidebar_height_output}; transform: translateX({translate_x_sidebar});"
			class="z-40 rounded-t-2xl md:rounded-none fixed bottom-0 w-full sm:w-2/5 md:h-full md:w-[380px] bg-white dark:bg-slate-900 bg-opacity-80 md:dark:bg-opacity-90 backdrop-blur-md md:bg-opacity-90 md:fixed md:left-0 md:top-0 md:bottom-0 text-black dark:text-white"
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
			<SidebarInternals usunits={usunits} {latest_item_on_stack} {darkMode} />
		</div>
	{/if}
</div>
{#if !$isLoading}
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
				{#if geolocation != null}
					{#if typeof geolocation.coords == 'object'}
						{#if typeof geolocation.coords.speed == 'number'}
							<div
								on:click={(e) => {
									e.preventDefault();
								}}
								class="leading-tight md:text-base rounded-lg text-black bg-white dark:text-white border border-gray-500 dark:bg-slate-800 shadow-sm shadow-slate-400 dark:shadow-slate-700 px-1 py-0.5"
								style={`font-size: 0px;bottom: ${gpsbutton_bottom_offset_calc()}`}
							>
								<p class="leading-none">
									{#if geolocation}
										{#if usunits}
											<span class="font-semibold text-sm"
												>{(2.23694 * geolocation.coords.speed).toFixed(1).split('.')[0]}</span
											>
										{:else}
											<span class="font-semibold text-sm"
												>{(3.6 * geolocation.coords.speed).toFixed(1).split('.')[0]}</span
											>
										{/if}
										{#if ['fr', 'de', 'it', 'es', 'se'].includes(current_locale.split('-')[0])}
											<span class="text-sm">,</span>
										{:else}
											<span class="text-sm">.</span>
										{/if}
										{#if usunits}
											<span class="text-sm"
												>{(2.23694 * geolocation.coords.speed).toFixed(1).split('.')[1]}</span
											>
										{:else}
											<span class="text-sm"
												>{(3.6 * geolocation.coords.speed).toFixed(1).split('.')[1]}</span
											>
										{/if}
										{#if usunits}<br />
											<span class="text-xs">mph</span>
										{:else}<br />
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
{/if}

{#if !$isLoading}
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
				text={$_('headingIntercityRail')}
				changesetting={() => {
					selectedSettingsTab = 'intercityrail';
				}}
				cssclass={`${
					selectedSettingsTab === 'intercityrail' ? enabledlayerstyle : disabledlayerstyle
				} w-1/2 py-1 px-1`}
			/>

			<Layerselectionbox
				text={$_('headingLocalRail')}
				changesetting={() => {
					selectedSettingsTab = 'localrail';
				}}
				cssclass={`${
					selectedSettingsTab === 'localrail' ? enabledlayerstyle : disabledlayerstyle
				} w-1/2 py-1 px-1`}
			/>

			<Layerselectionbox
				text={$_('headingBus')}
				changesetting={() => {
					selectedSettingsTab = 'bus';
				}}
				cssclass={`${
					selectedSettingsTab === 'bus' ? enabledlayerstyle : disabledlayerstyle
				} w-1/2 py-1 px-1`}
			/>

			<Layerselectionbox
				text={$_('headingOther')}
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
				<p class="w-full align-center text-center">{$_('headingMisc')}</p>
			</div>
		</div>

		{#if selectedSettingsTab === 'more'}
			<div class="flex flex-row gap-x-1 flex-wrap">
				<Layerbutton
					bind:layersettings
					selectedSettingsTab="more"
					change="foamermode"
					nestedchange="infra"
					name={$_('orminfra')}
					urlicon="https://b.tiles.openrailwaymap.org/standard/14/2866/6611.png"
					{runSettingsAdapt}
				/>

				<Layerbutton
					bind:layersettings
					selectedSettingsTab="more"
					change="foamermode"
					nestedchange="maxspeed"
					name={$_('ormspeeds')}
					urlicon="https://b.tiles.openrailwaymap.org/maxspeed/14/2866/6611.png"
					{runSettingsAdapt}
				/>

				<Layerbutton
					bind:layersettings
					selectedSettingsTab="more"
					change="foamermode"
					nestedchange="signalling"
					name={$_('ormsignalling')}
					urlicon="https://b.tiles.openrailwaymap.org/signals/14/2866/6611.png"
					{runSettingsAdapt}
				/>

				<Layerbutton
					bind:layersettings
					selectedSettingsTab="more"
					change="foamermode"
					nestedchange="electrification"
					name={$_('ormelectrification')}
					urlicon="https://b.tiles.openrailwaymap.org/electrification/14/2866/6611.png"
					{runSettingsAdapt}
				/>

				<Layerbutton
					bind:layersettings
					selectedSettingsTab="more"
					change="foamermode"
					nestedchange="gauge"
					name={$_('ormgauge')}
					urlicon="https://b.tiles.openrailwaymap.org/gauge/14/2866/6611.png"
					{runSettingsAdapt}
				/>
				<Layerbutton
					bind:layersettings
					selectedSettingsTab="more"
					change="foamermode"
					nestedchange="dummy"
					name={$_('none')}
					urlicon="https://b.tiles.openrailwaymap.org/standard/3/2/1.png"
					{runSettingsAdapt}
				/>
			</div>

			<div>
				<input
					on:click={(x) => {
						show_zombie_buses_store.update((value) => !value);

						localStorage.setItem('showzombiebuses', String(showzombiebuses));

						runSettingsAdapt();
					}}
					on:keydown={(x) => {
						show_zombie_buses_store.update((value) => !value);

						localStorage.setItem('showzombiebuses', String(showzombiebuses));

						runSettingsAdapt();
					}}
					checked={showzombiebuses}
					id="show-zombie-buses"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="show-zombie-buses" class="ml-2">{$_('showtripless')}</label>
			</div>
			<div>
				<input
					on:click={(x) => {
						show_my_location_store.update((value) => !value);

						localStorage.setItem('show-my-location', String(show_my_location));

						runSettingsAdapt();
					}}
					on:keydown={(x) => {
						show_my_location_store.update((value) => !value);

						localStorage.setItem('show-my-location', String(show_my_location));

						runSettingsAdapt();
					}}
					checked={show_my_location}
					id="show-zombie-buses"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="show-my-location" class="ml-2">{$_('showmylocation')}</label>
			</div>
		{/if}

		{#if ['other', 'bus', 'intercityrail', 'localrail'].includes(selectedSettingsTab)}
			<div class="flex flex-row gap-x-1">
				<Layerbutton
					bind:layersettings
					bind:selectedSettingsTab
					change="shapes"
					name={$_('routes')}
					urlicon="/routesicon.svg"
					{runSettingsAdapt}
				/>

				<Layerbutton
					bind:layersettings
					bind:selectedSettingsTab
					change="labelshapes"
					name={$_('labels')}
					urlicon="/labelsicon.svg"
					{runSettingsAdapt}
				/>

				<Layerbutton
					bind:layersettings
					bind:selectedSettingsTab
					change="stops"
					name={$_('stops')}
					urlicon="/stopsicon.svg"
					{runSettingsAdapt}
				/>

				<Layerbutton
					bind:layersettings
					bind:selectedSettingsTab
					change="stoplabels"
					name={$_('stopnames')}
					urlicon={darkMode ? '/dark-stop-name.png' : '/light-stop-name.png'}
					{runSettingsAdapt}
				/>

				<Layerbutton
					bind:layersettings
					bind:selectedSettingsTab
					change="visible"
					name={$_('vehicles')}
					urlicon="/vehiclesicon.svg"
					{runSettingsAdapt}
				/>
			</div>
			<div class="flex flex-row gap-x-1">
				<Realtimelabel
					bind:layersettings
					bind:selectedSettingsTab
					change="route"
					name={$_('showroute')}
					symbol="route"
					{runSettingsAdapt}
				/>
				<Realtimelabel
					bind:layersettings
					bind:selectedSettingsTab
					change="trip"
					name={$_('showtrip')}
					symbol="mode_of_travel"
					{runSettingsAdapt}
				/>
				<Realtimelabel
					bind:layersettings
					bind:selectedSettingsTab
					change="vehicle"
					name={$_('showvehicle')}
					symbol="train"
					{runSettingsAdapt}
				/>

				<Realtimelabel
					bind:layersettings
					bind:selectedSettingsTab
					change="headsign"
					name={$_('headsign')}
					symbol="sports_score"
					{runSettingsAdapt}
				/>

				<Realtimelabel
					bind:layersettings
					bind:selectedSettingsTab
					change="speed"
					name={$_('showspeed')}
					symbol="speed"
					{runSettingsAdapt}
				/>
			</div>
		{/if}
	</div>
{/if}

<style>
	* {
		cursor: default;
		font-family: 'Barlow', sans-serif;
		user-select: none;
	}

	.material-symbols-outlined {
		font-family: 'Material Symbols Outlined', sans-serif;
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
