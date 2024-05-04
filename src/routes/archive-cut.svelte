<script lang="ts">
	import { createGeoJSONCircle, componentToHex } from '../geoMathsAssist';
	import mapboxgl from 'mapbox-gl';
	import { onMount } from 'svelte';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
	import { addGeoRadius, setUserCircles } from '../components/userradius';
	import { hexToRgb, rgbToHsl, hslToRgb } from '../utils/colour';
	import { browser } from '$app/environment';
	import { decode as decodeToAry, encode as encodeAry } from 'base65536';
	import { flatten } from '../utils/flatten';
	import { determineFeedsUsingChateaus } from '../maploaddata';
	import { makeCircleLayers } from '../components/addLayers/addLiveDots';
	import Layerbutton from '../components/layerbutton.svelte';
	import Realtimelabel from '../realtimelabel.svelte';
	import Layerselectionbox from '../components/layerselectionbox.svelte';
	import { durationToIsoElapsed } from '../utils/isoelapsed';
	import {
		add_bunny_layer,
		make_custom_icon_source,
		new_jeans_buses
	} from '../components/addLayers/customIcons';
	import {
		what_kactus_to_use,
		what_martin_to_use,
		what_backend_to_use,
		check_kactus,
		check_backend
	} from '../components/distributed';
	import {
		addStopsLayers,
		changeRailTextOutsideNorthAmerica
	} from '../components/addLayers/addStops';
	import CloseButton from '../components/CloseButton.svelte';

	import { makeBearingArrowPointers } from '../components/addLayers/makebearingarrowpointers';

	import i18n from '../i18n/strings';
	import Alertpopup from '../components/alertpopup.svelte';
	import { addShapes } from '../components/addLayers/addShapes';
	import Artwork from '../components/artwork.svelte';
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
	import { lightenColour } from '../components/lightenDarkColour';

	const enabledlayerstyle =
		'text-black dark:text-white bg-blue-200 dark:bg-gray-700 border border-blue-800 dark:border-blue-200 text-sm md:text-sm';
	const disabledlayerstyle =
		'text-gray-900 dark:text-gray-50 border bg-gray-300 border-gray-400 dark:bg-gray-800  dark:border-gray-700 text-sm md:text-sm';

	let darkMode = true;

	let strings = i18n.en;
	let locale = 'en';

	//sidebar current open parameters
	// middle | full | none
	let sidebarOpen: string = 'none';
	let sidebar_height_output: string = '24px';
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

	function mousemovesidebar(e:TouchEvent | MouseEvent) {
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
					let difference = (start_of_move_pointer_height - clientY) - y_velocity;
					//console.log('sidebar new difference', difference);
					sidebar_height_number = start_of_move_sidebar_height + difference;
					//console.log('sidebar new height', sidebar_height_number);

					sidebar_height_output = sidebar_height_number + "px";

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

					if ((clientY + (10 * y_velocity)) > 0.7 * window.innerHeight) {
						sidebarOpen = "none";
					} else {
						if (clientY + (10 * y_velocity) < 0.3 * window.innerHeight) {
							sidebarOpen = "full";
						} else {
							sidebarOpen = "middle";
						}
					}
				}
		}

		//console.log('sidebar new target', sidebarOpen, clientY);
	}

	function startmovesidebar(e:TouchEvent | MouseEvent) {
		currently_holding_sidebar_grabber=true;
		if (e instanceof MouseEvent) {
			start_of_move_pointer_height = e.clientY;
		} else {
			start_of_move_pointer_height = e.touches[0].clientY;
		}
		start_of_move_sidebar_height = document.getElementById('catenary-sidebar').offsetHeight;
		console.log('start moving sidebar')
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
		change_map_padding();
	}

	if (typeof window !== 'undefined') {
		// this must be fixed to allow subvariants of languages
		// @ts-expect-error
		strings = i18n[window.localStorage.language || 'en'];
		locale = window.localStorage.language || 'en';
	}

	//false means use metric, true means use us units
	let selectedSettingsTab = 'localrail';
	let usunits = false;

	let announcermode = false;
	//stores geojson data for currently rendered GeoJSON realtime vehicles data, indexed by realtime feed id
	let geometryObj: Record<string, any> = {};
	let lasttimeofnorth = 0;
	let westOfMinus52 = true;
	let feed_id_to_chateau_lookup: Record<string, string> = {};
	let chateau_to_realtime_feed_lookup: Record<string, string[]> = {};
	let pending_chateau_rt_request: Record<string, number> = {};
	let on_sidebar_trigger = 0;

	let data_stack: StackInterface[] = [];
	let latest_item_on_stack: StackInterface | null = null;

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

	//order by route type, then by chateau, then by rt id
	let realtime_vehicle_locations: Record<string, Record<string, Record<string, any>>> = {};
	//order by chateau, then by route id
	let realtime_vehicle_route_cache: Record<string, Record<string, any>> = {};
	//order by chateau + categoryid
	let realtime_vehicle_route_cache_hash: Record<string, Record<string, number>> = {};
	//order by chateau + categoryid
	let realtime_vehicle_locations_last_updated: Record<string, Record<string, number>> = {};

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
	let chateaus_in_frame: string[] = [];

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

	const decode = (textToDecode: string) => {
		try {
			return new TextDecoder().decode(decodeToAry(textToDecode));
		} catch (e) {
			return 'Decode failed: Invalid input';
		}
	};

	function handleUsUnitsSwitch() {
		usunits = !usunits;

		localStorage.setItem('units', usunits ? 'us' : 'metric');

		//redo settings
	}

	function handleAnnouncerModeSwitch() {
		announcermode = !announcermode;
		localStorage.setItem('audibleArrivals', announcermode ? 'true' : 'false');
	}

	let showzombiebuses = false;

	if (browser) {
		if (localStorage.getItem('units') === 'us') {
			usunits = true;
		} else {
			usunits = false;
		}

		if (localStorage.getItem('fpsmode') === 'true') {
			fpsmode = true;
		} else {
			fpsmode = false;
		}

		if (localStorage.getItem('audibleArrivals') === 'true') {
			announcermode = true;
		} else {
			announcermode = false;
		}
	}

	if (browser) {
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

	let maplat: number, maplng: number, mapzoom: number;
	// trip data, indexed via static_feed_id then trip_id
	let trips_per_chateau: Record<string, Record<string, any>> = {};
	let layersettingsBox = false;

	const lockonconst = 14.5;

	let mapglobal: mapboxgl.Map;
	let firstmove = false;
	let secondrequestlockgps = false;

	//	let binaryDataOfGtfsRt: any = new Object();

	let lockongps = false;
	maplng = 0;
	maplat = 0;
	mapzoom = 0;

	let showclipboardalert = false;
	let lastclipboardtime: number = 0;

	function change_map_padding() {
		if (mapglobal) {
			if (document.getElementById('catenary-sidebar')) {
				if (window.innerWidth >= 768) {
					if (sidebarOpen == 'full') {
						mapglobal.setPadding({
							padding: {
								left: document.getElementById('catenary-sidebar')?.offsetWidth,
								right: 0,
								top: 0,
								bottom: 0
							},
							duration: 500
						});
					}
				} else {
					if (window.innerWidth >= 640) {
						if (sidebarOpen == 'middle') {
							mapglobal.setPadding({
								padding: {
									left: document.getElementById('catenary-sidebar')?.offsetWidth,
									right: 0,
									top: 0,
									bottom: 0
								},
								duration: 500
							});
						}
					} else {
						mapglobal.setPadding({
							padding: {
								left: 0,
								right: 0,
								top: 0,
								bottom: document.getElementById('catenary-sidebar')?.offsetHeight
							},
							duration: 500
						});
					}
				}
			}
		}
	}

	// Get the JSON object from local storage

	const layersettingsnamestorage = 'layersettingsv4';

	if (browser) {
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

	function saveCoordsToClipboard() {
		console.log('save coords');

		let textClipboard = `${strings.coordsview}: ${maplat.toFixed(5)}, ${maplng.toFixed(
			5
		)} Z: ${mapzoom.toFixed(2)}`;
		if (typeof geolocation === 'object') {
			textClipboard += `\nGPS: ${geolocation.coords.latitude.toFixed(
				5
			)}, ${geolocation.coords.longitude.toFixed(5)}`;

			if (geolocation.coords.heading) {
				textClipboard += ` Heading: ${geolocation.coords.heading.toFixed(2)}`;
			}

			if (geolocation.coords.speed) {
				textClipboard += ` Speed: ${geolocation.coords.speed.toFixed(2)} m/s  Speed: ${(
					3.6 * geolocation.coords.speed
				).toFixed(2)} km/h`;
			}

			if (geolocation.coords.altitude) {
				textClipboard += ` Alt: ${geolocation.coords.altitude.toFixed(2)}`;
			}
		}

		navigator.clipboard.writeText(textClipboard);
		showclipboardalert = true;
		lastclipboardtime = Date.now();

		setTimeout(() => {
			if (lastclipboardtime < Date.now() - 500) {
				showclipboardalert = false;
			}
		}, 501);
	}

	const interleave = (arr: any, thing: any) =>
		[].concat(...arr.map((n: any) => [n, thing])).slice(0, -1);

	function getBoundingBoxMap(): number[][] {
		const canvas = mapglobal.getCanvas(),
			w: number = canvas.width,
			h: number = canvas.height;

		const cUL = mapglobal.unproject([0, 0]).toArray(),
			top = mapglobal.unproject([w / 2, 0]).toArray(),
			cUR = mapglobal.unproject([w, 0]).toArray(),
			right = mapglobal.unproject([w, h / 2]).toArray(),
			cLR = mapglobal.unproject([w, h]).toArray(),
			bottom = mapglobal.unproject([w / 2, h]).toArray(),
			cLL = mapglobal.unproject([0, h]).toArray(),
			left = mapglobal.unproject([0, h / 2]).toArray();

		var coordinates = [cUL, top, cUR, right, cLR, bottom, cLL, left, cUL];

		return coordinates;
	}

	function rgbToHex(r: number, g: number, b: number) {
		return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
	}

	let lasttimezoomran = 0;

	const convertArrayToObject = (array: any[], key: string) => {
		const initialValue = {};
		return array.reduce((obj, item) => {
			return {
				...obj,
				[item[key]]: item
			};
		}, initialValue);
	};

	let geolocation: GeolocationPosition;

	let lastknownheading: number;

	let alerts: any[] = [];

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

		fetch('https://catenarytransit.github.io/ping/pong.json')
			.then((x) => x.json())
			.then((x) => {
				console.log('ping', x);
				alerts = x.alerts;
			});

		const API_KEY = 'tf30gb2F4vIsBW5k9Msd';

		let rtFeedsTimestampsVehicles: any = new Object();
		let rtFeedsHashVehicles: any = new Object();

		//let dark = 'https://api.maptiler.com/maps/68c2a685-a6e4-4e26-b1c1-25b394003539';

		//let light = 'https://api.maptiler.com/maps/dbb80139-208d-449f-a69e-31243c0ee779';

		//does user have localstorage cachegeolocation

		let centerinit = [-118, 33.9];

		let zoominit = 8.1;

		if (browser) {
			if ('cachegeolocation' in localStorage) {
				let cachegeolocation = localStorage.getItem('cachegeolocation').split(',');
				console.log('cachegeolocation', cachegeolocation);
				if (cachegeolocation.length > 1) {
					centerinit = [cachegeolocation[0], cachegeolocation[1]];
					//mimic Google and Transit App inital zoom
					zoominit = 13.4;
				}
			}
		}

		//get url param "sat"

		let style: string | undefined = darkMode
			? 'mapbox://styles/kylerschin/clm2i6cmg00fw01of2vp5h9p5'
			: 'mapbox://styles/kylerschin/cllpbma0e002h01r6afyzcmd8';

		if (browser) {
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

		const map = new mapboxgl.Map({
			container: 'map',
			crossSourceCollisions: true,
			hash: 'pos',
			useWebGL2: true,
			preserveDrawingBuffer: false,
			attributionControl: false,
			//	antialias: true,
			style, // stylesheet location
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

		map.on('load', () => {
			//screen.orientation.unlock();
			/*
			map.addLayer({
				id: "hasbearing_position",
				type: "symbol",
				paint: {
					"": ""
				}			
			})*/

			
		});

		function runBoxCalc() {
			mapboundingbox = getBoundingBoxMap();

			//console.log('mapboundingbox',mapboundingbox)

			if (debugmode) {
				mapboundingboxstring = mapboundingbox
					.map((x) => `${x[1].toFixed(4)},${x[0].toFixed(4)}`)
					.join('/');
			}
		}

		function changeSizeBasedOnLocation() {
			//if the current map is east of minus 52 lng
			if (westOfMinus52 == true && maplng >= -52) {
				westOfMinus52 = false;
				changeRailTextOutsideNorthAmerica(map, layerspercategory);
			}

			//if the current map is west of minus 52 lng
			if (westOfMinus52 == false && maplng < -52) {
				westOfMinus52 = true;
				changeRailTextOutsideNorthAmerica(map, layerspercategory);
			}
		}

		map.on('move', () => {
			updateData();
			changeSizeBasedOnLocation();
			if (performance.now() - lastrunmapcalc > 50) {
				runBoxCalc();
				lastrunmapcalc = performance.now();
			}
		});

		map.on('mousemove', () => {
			firstmove = true;
			lockongps = false;
			secondrequestlockgps = false;
		});

		map.on('touchmove', () => {
			firstmove = true;
			lockongps = false;
			secondrequestlockgps = false;
		});

		map.on('idle', () => {
			runBoxCalc();

			if (lasttimezoomran < Date.now() - 5000) {
				lasttimezoomran = Date.now();

				//renderNewBearings();

				runSettingsAdapt();
			}
		});
	});

	function togglelayerfeature() {
		layersettingsBox = !layersettingsBox;
	}

	if (typeof window === 'object') {
		document.getElementsByTagName('body')[0].classList.add('overflow-none');
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

				lockongps = true;

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
						lockongps = true;
						secondrequestlockgps = true;
					}

					mapglobal.easeTo(target, { duration: 500 });
				}
			}
		}
	}
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
<!-- Google Tag Manager (noscript) -->
<noscript
	><iframe
		src="https://www.googletagmanager.com/ns.html?id=GTM-WD62NKLX"
		height="0"
		width="0"
		style="display:none;visibility:hidden"
		title="Google Tag Manager"
	/></noscript
>
<!-- End Google Tag Manager (noscript) -->

<div id="map" class="fixed top-0 left-0 w-[100vw] h-[100vh]" />
{#key sidebar_height_output}
	<div
		id="catenary-sidebar"
		style={`height: ${sidebar_height_output}`}
		class="z-40 rounded-t-2xl md:rounded-none fixed bottom-0 shadow-lg dark:shadow-gray-800 w-full sm:w-2/5 md:h-full md:w-[380px] lg:w-[408px] bg-white dark:bg-slate-900 md:dark:bg-opacity-90 backdrop-blur-md md:bg-opacity-90 md:dark:backdrop-blur-md md:fixed md:left-0 md:top-0 md:bottom-0 text-black dark:text-white"
	>
		{#key on_sidebar_trigger}
			<div
				id="sidebar-grabber"
				class="md:hidden py-2 flex flex-row cursor-ns-resize"
				aria-label="Move sidebar"
				role="none"
				on:mousedown={startmovesidebar}
				on:touchstart={startmovesidebar}
			>
				<div class="mx-auto rounded-lg px-8 py-1 bg-sky-500 dark:bg-sky-400"></div>
			</div>
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
	</div>
{/key}

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

