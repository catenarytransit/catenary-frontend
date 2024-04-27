<script lang="ts">
	import { createGeoJSONCircle, componentToHex } from '../geoMathsAssist';
	import mapboxgl from 'mapbox-gl';
	import { onMount } from 'svelte';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
	import { blur, fade } from 'svelte/transition';
	import { addGeoRadius, setUserCircles } from '../components/userradius';
	import { hexToRgb, rgbToHsl, hslToRgb } from '../utils/colour';
	import { browser } from '$app/environment';
	import { decode as decodeToAry, encode as encodeAry } from 'base65536';
	import { interpretLabelsToCode } from '../components/rtLabelsToMapboxStyle';
	import { flatten } from '../utils/flatten';
	import { determineFeeds, determineFeedsUsingChateaus } from '../maploaddata';
	import { makeCircleLayers } from '../components/addLayers/addLiveDots';
	import Layerbutton from '../components/layerbutton.svelte';
	import Realtimelabel from '../realtimelabel.svelte';
	import Layerselectionbox from '../components/layerselectionbox.svelte';
	import MetrolinkDepartureDemo from '../components/MetrolinkDepartureDemo.svelte';
	import type MetrolinkTrackArrivals from '../components/MetrolinkDepartureDemo.svelte';
	import type SelectedVehicleKeyType from '../components/vehicleselected.svelte';
	import VehicleSelected from '../components/vehicleselected.svelte';
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

	const enabledlayerstyle =
		'text-black dark:text-white bg-blue-200 dark:bg-gray-700 border border-blue-800 dark:border-blue-200 text-sm md:text-sm';
	const disabledlayerstyle =
		'text-gray-900 dark:text-gray-50 border bg-gray-300 border-gray-400 dark:bg-gray-800  dark:border-gray-700 text-sm md:text-sm';

	let darkMode = true;

	let strings = i18n.en;
	let locale = 'en';

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

	let data_stack: Array<any> = [];

	const urlParams =
		typeof window !== 'undefined'
			? new URLSearchParams(window.location.search)
			: new URLSearchParams();
	let debugmode = !!urlParams.get('debug');

	let fpsmode = !!urlParams.get('fps');

	let embedmode = urlParams.get('framework') == 'true';

	let desktopapp = urlParams.get('desktop') == 'true';
	let mobileapp = urlParams.get('utm_source') == 'pwa';

	let sidebarCollapsed = desktopapp;
	let sidebarView = 0;

	let current_map_heading = 0;

	let static_feeds_in_frame: Record<string, any> = {};
	let operators_in_frame: Record<string, any> = {};
	let realtime_feeds_in_frame: Record<string, any> = {};

	//order by route type, then by chateau, then by rt id
	let realtime_vehicle_locations: Record<string, Record<string, Record<string, any>>> = {};
	//order by chateau, then by route id
	let realtime_vehicle_route_cache: Record<string, Record<string, any>> = {};
	//order by chateau
	let realtime_vehicle_route_cache_hash: Record<string, number> = {};
	//order by chateau
	let realtime_vehicle_locations_last_updated: Record<string, number> = {};
	

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

	// Save the JSON object to local storage
	//localStorage.setItem("myJsonObject", JSON.stringify(jsonObject));

	let layersettings: any = {
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

				let regularpointers = ['!=', 0, ['get', 'bearing']];
				let hidevehiclecommandpointers = [
					'all',
					['!=', '', ['get', 'tripIdLabel']],
					['!=', 0, ['get', 'bearing']]
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

					this_realtime_feeds_list.forEach(
						(realtime) => {
							feed_id_to_chateau_lookup[realtime] = feature.properties.chateau;
						}
					);

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

		map.on('click', (e) => {
			console.log('clicked on ', e);

			const click_bbox :[mapboxgl.PointLike, mapboxgl.PointLike]  = [
                [e.point.x - 3, e.point.y - 3],
                [e.point.x + 3, e.point.y + 3]
            ];

			try {
				const selectedFeatures = map.queryRenderedFeatures(click_bbox, {
                layers: Object.values(layerspercategory).map((x) => Object.values(x)).flat()
            });

			console.log('selectedFeatures', selectedFeatures);
			} catch (e) {
				console.error(e);
			}
		});

		map.on('moveend', (events) => {
			let chateau_feed_results = determineFeedsUsingChateaus(map);
			chateaus_in_frame = Array.from(chateau_feed_results.chateaus);
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
			chateaus_in_frame = Array.from(chateau_feed_results.chateaus);
		});

		function category_name_to_source_name(category: string):string {
			switch (category) {
				case 'bus': return 'buses';
				case 'rail': return 'intercityrail';
				case 'metro': return 'localrail';
				case 'other': return 'other';
			};

			//lets just pretend this will never happen
			return "";
		}

		function rerender_category_live_dots(category: string) {
			let source_name:string = category_name_to_source_name(category);

			let source = map.getSource(source_name);

			console.log('source', category, source);

			let features = [];

			for (const chateau_id in realtime_vehicle_locations[category]) {
				let chateau_vehicles_list = realtime_vehicle_locations[category][chateau_id];
				
				//console.log('chateau_vehicles_list ', chateau_id, category, chateau_vehicles_list)

				let chateau_route_cache = realtime_vehicle_route_cache[chateau_id];

				for (const vehicle_entry in chateau_vehicles_list) {
					let vehicle_data = chateau_vehicles_list[vehicle_entry];
					let vehiclelabel = vehicle_data.vehicle?.label || vehicle_data.vehicle?.id || '';
					let colour = '#aaaaaa';

					let tripIdLabel = "";
					let headsign = "";

					if (vehicle_data.trip) {
						if (vehicle_data.trip.trip_short_name) {
							tripIdLabel = vehicle_data.trip.trip_short_name;
						} else {
							tripIdLabel = vehicle_data.trip.trip_id;
						}

						if (vehicle_data.trip.trip_headsign) {
							headsign = vehicle_data.trip.trip_headsign;
						}
					}

					let routeId = vehicle_data.trip?.route_id;
					let maptag = "";

					if (routeId) {
						let route = chateau_route_cache[routeId];

						if (route) {
							
							if (route.route_short_name != "" && route.route_short_name != null) {
								maptag = route.route_short_name;
							} else {
								maptag = route.route_long_name;
							}
							colour = route.route_colour;
						} else {
							console.log("Could not find route for ", chateau_id, routeId);
						}
					}

					let contrastdarkmode = colour;
						let contrastdarkmodebearing = colour;

						if (colour && darkMode === true) {
							//convert hex colour to array of 3 numbers

							let rgb = hexToRgb(colour);

							// console.log('rgb', rgb)

							if (rgb != null) {
								let hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

								// console.log('hsl', hsl)

								let newdarkhsl = hsl;

								let blueoffset = 0;

								if (rgb.b > 40) {
									blueoffset = 30 * (rgb.b / 255);
								}

								if (hsl.l < 60) {
									newdarkhsl.l = hsl.l + 10 + (25 * ((100 - hsl.s) / 100) + blueoffset);

									if (hsl.l > 60) {
										if (blueoffset === 0) {
											hsl.l = 60;
										} else {
											hsl.l = 60 + blueoffset;
										}
									}
								}

								hsl.l = Math.min(100, hsl.l);
								let newdarkrgb = hslToRgb(newdarkhsl.h, newdarkhsl.s, newdarkhsl.l);

								let newdarkbearingline = hslToRgb(
									newdarkhsl.h,
									newdarkhsl.s,
									(newdarkhsl.l + hsl.l) / 2
								);

								contrastdarkmode = `#${componentToHex(newdarkrgb.r)}${componentToHex(
									newdarkrgb.g
								)}${componentToHex(newdarkrgb.b)}`;
								contrastdarkmodebearing = `#${componentToHex(newdarkbearingline.r)}${componentToHex(
									newdarkbearingline.g
								)}${componentToHex(newdarkbearingline.b)}`;
								//  console.log('rgbtohex',contrastdarkmode)
							}
						}

					features.push({
							type: 'Feature',
							properties: {
								//shown to user directly?
								vehicleIdLabel: vehiclelabel,
								//maintain metres per second, do conversion in label
								speed: vehicle_data?.position?.speed,
								color: colour,
								chateau: chateau_id,
								//int representing enum
								routeType: vehicle_data.route_type,
								//keep to gtfs lookup
								tripIdLabel: tripIdLabel,
								//keep to degrees as gtfs specs
								bearing: vehicle_data?.position?.bearing,
								has_bearing: vehicle_data?.position?.bearing != null,
								maptag: maptag,
								contrastdarkmode: contrastdarkmode,
								contrastdarkmodebearing,
								routeId: routeId,
								headsign: headsign,
								timestamp: vehicle_data.timestamp,
								id: vehicle_entry
							},
							geometry: {
								type: 'Point',
								coordinates: [vehicle_data.position.longitude, vehicle_data.position.latitude]
							}
						});
				}
			}

			console.log('setting data for ', category, features);

			

				source.setData({
					type: 'FeatureCollection',
					features: features
				});
			
		}

		function garbageCollectNotInView() {
			//chateaus_in_frame

			let chateaus_in_frame_set = new Set(chateaus_in_frame);

			Object.values(realtime_vehicle_locations)
			.forEach((category) => {
				Object.keys(category)
				.forEach((chateau_id) => {
					if (!chateaus_in_frame_set.has(chateau_id)) {
						delete category[chateau_id];
					}
				})
			});

			Object.keys(realtime_vehicle_route_cache)
			.forEach((chateau_id) => {
				if (!chateaus_in_frame_set.has(chateau_id)) {
					delete realtime_vehicle_route_cache[chateau_id];
				}
			});

			Object.keys(realtime_vehicle_route_cache_hash)
			.forEach((chateau_id) => {
				if (!chateaus_in_frame_set.has(chateau_id)) {
					delete realtime_vehicle_route_cache_hash[chateau_id];
				}
			});

			Object.keys(realtime_vehicle_locations_last_updated)
			.forEach((chateau_id) => {
				if (!chateaus_in_frame_set.has(chateau_id)) {
					delete realtime_vehicle_locations_last_updated[chateau_id];
				}
			});
		}

		function process_realtime_vehicle_locations(
			chateau_id: string,
			category: string,
			response_from_birch_vehicles: any
		) {
			if (realtime_vehicle_locations[category] === undefined) {
				realtime_vehicle_locations[category] = {};
			}

			if (realtime_vehicle_locations[category][chateau_id] === undefined) {
				realtime_vehicle_locations[category][chateau_id] = {};
			}

			realtime_vehicle_locations[category][chateau_id] = response_from_birch_vehicles.vehicle_positions;

			if (realtime_vehicle_route_cache[chateau_id] === undefined) {
				realtime_vehicle_route_cache[chateau_id] = {};
			}

			if (response_from_birch_vehicles.vehicle_route_cache) {
					if (Object.keys(response_from_birch_vehicles.vehicle_route_cache).length != 0) {
				//	console.log('updating route cache', chateau_id, response_from_birch_vehicles.vehicle_route_cache);
					realtime_vehicle_route_cache[chateau_id] = response_from_birch_vehicles.vehicle_route_cache;
				}
			}

			
				realtime_vehicle_route_cache_hash[chateau_id] = response_from_birch_vehicles.hash_of_routes;
				realtime_vehicle_locations_last_updated[chateau_id] = response_from_birch_vehicles.last_updated_time_ms;
			
			rerender_category_live_dots(category);
			//console.log('brand new vehicle data!', realtime_vehicle_locations);
		}

		function fetch_realtime_vehicle_locations() {
			
			let categories_to_request:string[] = [];

			if (layersettings.bus.visible) {
				categories_to_request.push('bus');
			}

			if (layersettings.intercityrail.visible) {
				categories_to_request.push('rail');
			}

			if (layersettings.localrail.visible) {
				categories_to_request.push('metro');
			}

			if (layersettings.other.visible) {
				categories_to_request.push('other');
			}

			chateaus_in_frame.forEach((chateauId) => {
				categories_to_request.forEach((category) => {

					if (chateau_to_realtime_feed_lookup[chateauId]) {

					
					let last_updated_time_ms: number = realtime_vehicle_locations_last_updated[chateauId] || 0;
					let existing_fasthash: number = realtime_vehicle_route_cache_hash[chateauId] || 0;

					let url = `https://birch.catenarymaps.org/get_realtime_locations/${chateauId}/${category}/${last_updated_time_ms}/${existing_fasthash}`;

	//	let url = `https://birch.catenarymaps.org/get_realtime_locations/${chateauId}/${category}/${last_updated_time_ms}/0`;

					if (chateau_to_realtime_feed_lookup[chateauId]) {
						let pending_chateau_rt_request_for_chateau = pending_chateau_rt_request[chateauId];

						let allowed_to_fetch = true;

						if (typeof pending_chateau_rt_request_for_chateau == 'number') {
							if (Date.now() - pending_chateau_rt_request_for_chateau > 20000) {
							//	allowed_to_fetch = true;
							} else {
								allowed_to_fetch = false;
							}
						}

						if (map.getZoom() < 3) {
							allowed_to_fetch = false;
						}

						if (map.getZoom() < 7 && category == 'bus') {
							allowed_to_fetch = false;

						}

						pending_chateau_rt_request[chateauId] = Date.now();



						if (allowed_to_fetch == true) {
							fetch(url)
						.then(async (response) => 
						{
							let response_from_birch_vehicles_text = await response.text();
							try {
								delete pending_chateau_rt_request[chateauId];
								let response_from_birch_vehicles = JSON.parse(response_from_birch_vehicles_text);
								process_realtime_vehicle_locations(chateauId, category, response_from_birch_vehicles);
							} catch (e) {
								return false;
							}
						}
					)
						.catch((err) => {
							delete pending_chateau_rt_request[chateauId];
						});
						}

						
					}
				}
					
				})
			});

			//garbageCollectNotInView();
		}
		fetch_realtime_vehicle_locations();

		function clearbottomright() {
			let bottomright = document.getElementsByClassName('mapboxgl-ctrl-bottom-right');

			if (bottomright) {
				if (bottomright[0] != undefined) {
					bottomright[0].remove();
				}
			}

			//console.log('requested rerender of ', rerenders_requested)
		}

		fetch_realtime_vehicle_locations();

			

		map.on('load', () => {
			//screen.orientation.unlock();

			clearbottomright();
			// Add new sources and layers
			let removelogo1 = document.getElementsByClassName('mapboxgl-ctrl-logo');

			if (removelogo1) {
				removelogo1[0].remove();
			}

			if (localStorage.getItem('showzombiebuses') === 'true') {
				showzombiebuses = true;
				runSettingsAdapt();
			}

			map.addSource('chateaus', {
				type: 'geojson',
				data: 'https://birch.catenarymaps.org/getchateaus'
			});

			map.addLayer({
				id: 'chateaus_calc',
				type: 'fill',
				source: 'chateaus',
				paint: {
					'fill-color': '#ffffff',
					'fill-opacity': 0
				}
			});

			addGeoRadius(map);
			if (debugmode) {
				map.addLayer({
					id: 'chateau_lines',
					type: 'line',
				source: 'chateaus',

					paint: {
						'line-color': '#10aa99',
						'line-opacity': 1
					}
				});

				map.addLayer({
					id: 'chateau_names',
					type: 'symbol',
				source: 'chateaus',
					layout: {
						'text-field': ['get', 'chateau'],
						'text-size': 10,
						//'text-allow-overlap': true,
						//'text-ignore-placement': true,
						'text-justify': 'center',
						'text-anchor': 'center',
						'text-padding': 0,
						'text-line-height': 1.2,
						'text-letter-spacing': 0.01,
						'text-max-width': 10,
						'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
						'text-offset': [0, 0]
					},
					paint: {
						'text-color': '#ffffff',
						'text-halo-color': '#003311',
						'text-halo-width': 1,
						'text-halo-blur': 1
					}
				});

				map.showTileBoundaries = true;

				const graticule: any = {
					type: 'FeatureCollection',
					features: []
				};

				const graticule_minor: any = {
					type: 'FeatureCollection',
					features: []
				};

				for (let lng = -180; lng <= 180; lng += 1) {
					graticule.features.push({
						type: 'Feature',
						geometry: {
							type: 'LineString',
							coordinates: [
								[lng, -90],
								[lng, 90]
							]
						},
						properties: { value: lng }
					});
				}
				for (let lat = -85; lat <= 85; lat += 1) {
					graticule.features.push({
						type: 'Feature',
						geometry: {
							type: 'LineString',
							coordinates: [
								[-180, lat],
								[180, lat]
							]
						},
						properties: { value: lat }
					});
				}

				for (let lng = -180; lng <= 180; lng += 0.1) {
					if (Math.floor(lng) != lng) {
						graticule_minor.features.push({
							type: 'Feature',
							geometry: {
								type: 'LineString',
								coordinates: [
									[lng, -90],
									[lng, 90]
								]
							},
							properties: { value: lng }
						});
					}
				}
				for (let lat = -85; lat <= 85; lat += 0.1) {
					if (Math.floor(lat) != lat) {
						graticule_minor.features.push({
							type: 'Feature',
							geometry: {
								type: 'LineString',
								coordinates: [
									[-180, lat],
									[180, lat]
								]
							},
							properties: { value: lat }
						});
					}
				}

				map.addSource('graticule', {
					type: 'geojson',
					data: graticule
				});

				map.addLayer({
					id: 'graticule',
					type: 'line',
					source: 'graticule',
					paint: {
						'line-color': '#aaa',
						'line-width': 1.5,
						'line-emissive-strength': 1
					},
					minzoom: 5
				});

				map.addLayer({
					id: 'labalgraticule',
					type: 'symbol',
					source: 'graticule',
					paint: {
						'text-color': '#bbb',
						'text-halo-color': '#004',
						'text-halo-width': 2
					},
					layout: {
						'text-field': ['coalesce', ['get', 'value'], '°'],
						'symbol-placement': 'line'
					},
					minzoom: 5
				});

				map.addSource('graticule_sub', {
					type: 'geojson',
					data: graticule_minor
				});
				map.addLayer({
					id: 'graticule_sub',
					type: 'line',
					source: 'graticule_sub',
					paint: {
						'line-color': '#888',
						'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.2, 10, 1]
					},
					minzoom: 7
				});
			}

			

			map.addSource('notbusshapes', {
				type: 'vector',
				url: 'https://birch.catenarymaps.org/shapes_not_bus'
			});

			map.addSource('busshapes', {
				type: 'vector',
				url: 'https://birch.catenarymaps.org/shapes_bus'
			});

			map.addSource('busstops', {
				type: 'vector',
				url: 'https://birch.catenarymaps.org/busstops'
			});

			map.addSource('stationfeatures', {
				type: 'vector',
				url: what_martin_to_use() + '/stationfeatures'
			});

			map.addSource('railstops', {
				type: 'vector',
				url: 'https://birch.catenarymaps.org/railstops'
			});

			map.addSource('otherstops', {
				type: 'vector',
				url: what_martin_to_use() + '/otherstops'
			});

			map.addSource('foamertiles', {
				type: 'raster',
				tiles: ['https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'],
				tileSize: 256
			});

			map.addSource('maxspeedtiles', {
				type: 'raster',
				tiles: ['https://a.tiles.openrailwaymap.org/maxspeed/{z}/{x}/{y}.png'],
				tileSize: 256
			});

			map.addSource('signallingtiles', {
				type: 'raster',
				tiles: ['https://a.tiles.openrailwaymap.org/signals/{z}/{x}/{y}.png'],
				tileSize: 256
			});

			map.addSource('electrificationtiles', {
				type: 'raster',
				tiles: ['https://a.tiles.openrailwaymap.org/electrification/{z}/{x}/{y}.png'],
				tileSize: 256
			});

			map.addSource('gaugetiles', {
				type: 'raster',
				tiles: ['https://a.tiles.openrailwaymap.org/gauge/{z}/{x}/{y}.png'],
				tileSize: 256
			});

			map.addLayer({
				id: 'foamershapes',
				type: 'raster',
				source: 'foamertiles'
			});

			map.addLayer({
				id: 'maxspeedshapes',
				type: 'raster',
				source: 'maxspeedtiles'
			});

			map.addLayer({
				id: 'signallingshapes',
				type: 'raster',
				source: 'signallingtiles'
			});

			map.addLayer({
				id: 'electrificationshapes',
				type: 'raster',
				source: 'electrificationtiles'
			});

			map.addLayer({
				id: 'gaugeshapes',
				type: 'raster',
				source: 'gaugetiles'
			});

			map.addLayer({
				id: 'ferryshapes',
				type: 'line',
				source: 'notbusshapes',
				'source-layer': 'data',
				filter: ['all', ['==', 4, ['get', 'route_type']]],
				paint: {
					'line-dasharray': [1, 2],
					'line-color': ['concat', '#', ['get', 'color']],
					'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 14, 3],
					'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 7, 0.9]
				},
				minzoom: 3
			});

			addShapes(map, darkMode, layerspercategory);

			addStopsLayers(map, darkMode, layerspercategory);

			map.loadImage('/station-enter.png', (error, image) => {
				if (error) throw error;

				map.addImage('station-enter', image);

				map.addLayer(
					{
						id: 'stationenter',
						type: 'symbol',
						source: 'stationfeatures',
						filter: ['all', ['==', 2, ['get', 'location_type']]],
						'source-layer': 'stationfeatures',
						paint: {
							'symbol-emissive-strength': 1
						},
						layout: {
							'icon-image': 'station-enter',
							'icon-size': [
								'interpolate',
								['linear'],
								['zoom'],
								14,
								0.2,
								15,
								0.2,
								16,
								0.25,
								18,
								0.4
							],
							'icon-ignore-placement': false,
							'icon-allow-overlap': true
						},

						minzoom: window?.innerWidth >= 1023 ? 14 : 15
					},
					layerspercategory.bus.stops
				);

				map.addLayer(
					{
						id: 'stationenterlabel',
						filter: ['all', ['==', 2, ['get', 'location_type']]],
						type: 'symbol',
						source: 'stationfeatures',
						'source-layer': 'stationfeatures',

						layout: {
							'text-field': ['get', 'name'],
							'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
							'text-size': ['interpolate', ['linear'], ['zoom'], 15, 5, 17, 8, 19, 9.5],
							'text-radial-offset': 1,
							'text-ignore-placement': false,
							//'icon-ignore-placement': false,
							'text-allow-overlap': true,
							//'symbol-avoid-edges': false,
							'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular']
						},
						paint: {
							'text-color': darkMode ? '#bae6fd' : '#1d4ed8',
							'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
							'text-halo-width': darkMode ? 0.4 : 0.2,
							'text-emissive-strength': 1
						},
						minzoom: window?.innerWidth >= 1023 ? 17.5 : 17
					},
					layerspercategory.bus.stops
				);
			});

			map.addSource('buses', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addSource('localrail', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addSource('intercityrail', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addSource('other', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			add_bunny_layer(map, layerspercategory);
			makeCircleLayers(map, darkMode, layerspercategory);
			makeBearingArrowPointers(map, darkMode, layerspercategory);

			make_custom_icon_source(map);

			runSettingsAdapt();

			map.addSource('geolocation', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [0, 0]
							},
							properties: {}
						}
					]
				}
			});

			map.addSource('userpositionacc', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addLayer({
				id: 'userpositionacclayer',
				type: 'fill',
				source: 'userpositionacc',
				paint: {
					'fill-color': '#38bdf8',
					'fill-opacity': ['get', 'opacity'],
					'fill-emissive-strength': 1
				}
			});

			runSettingsAdapt();

			map.loadImage('/geo-circle.png', (error, image) => {
				if (error) throw error;

				// Add the image to the map style.
				map.addImage('geocircle', image);

				map.addLayer({
					id: 'nobearing_position',
					type: 'symbol',
					source: 'geolocation', // reference the data source
					layout: {
						'icon-image': 'geocircle', // reference the image
						'icon-size': 0.1,
						visibility: 'none',
						'icon-allow-overlap': true,
						'icon-ignore-placement': true,
						'text-allow-overlap': true,
						'text-ignore-placement': true
					},
					paint: {
						'icon-opacity': 0.8,
						'icon-emissive-strength': 1
					}
				});
			});

			map.loadImage('/geo-nav.png', (error, image) => {
				if (error) throw error;
				// Add the image to the map style.
				map.addImage('geonav', image);

				map.addLayer({
					id: 'bearing_position',
					type: 'symbol',
					source: 'geolocation', // reference the data source
					layout: {
						'icon-image': 'geonav', // reference the image
						'icon-size': 0.13,
						'icon-rotate': ['get', 'heading'],
						visibility: 'none'
					},
					paint: {
						'icon-opacity': 0.8,
						'icon-emissive-strength': 1
					}
				});
			});

			/*
			map.addLayer({
				id: "hasbearing_position",
				type: "symbol",
				paint: {
					"": ""
				}			
			})*/

			let chateau_feed_results = determineFeedsUsingChateaus(map);
			chateaus_in_frame = Array.from(chateau_feed_results.chateaus);

			setInterval(() => {
				let chateau_feed_results = determineFeedsUsingChateaus(map);
			chateaus_in_frame = Array.from(chateau_feed_results.chateaus);
				fetch_realtime_vehicle_locations();
				garbageCollectNotInView()
			}, 1000);

			fetch_realtime_vehicle_locations();
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
	<!-- Google Tag Manager -->
	<!-- Google Tag Manager -->
	<!-- Google Tag Manager -->
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

<div id="catenary-sidebar "
	class="lg:h-full lg:w-[408px] bg-white dark:bg-slate-900 lg:fixed lg:left-0 lg:top-0 lg:bottom-0"
>
	a
</div>

<div class="fixed top-4 right-4 flex flex-col gap-y-2 pointer-events-none">
	<div
		on:click={togglelayerfeature}
		on:keypress={togglelayerfeature}
		class="!cursor-pointer bg-white z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center"
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
		class="bg-white z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center"
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
		<div
			on:click={gpsbutton}
			on:keydown={gpsbutton}
			on:touchstart={gpsbutton}
			class="${lockongps
				? ' text-blue-500 dark:text-blue-300'
				: ' text-black dark:text-gray-50'} select-none bg-white text-gray-900 z-50 fixed bottom-8 right-4 h-16 w-16 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
		>
			<span class="material-symbols-outlined align-middle text-lg select-none">
				{#if lockongps == true}my_location{:else}location_searching{/if}
			</span>
		</div>
	{/if}
</div>

<div
	class="fixed bottom-0 w-full rounded-t-lg sm:w-fit sm:bottom-4 sm:right-4 bg-white dark:bg-gray-900 dark:text-gray-50 bg-opacity-90 dark:bg-opacity-90 sm:rounded-lg z-50 px-3 py-2 {layersettingsBox
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
	:root {
		--background: #0a233f;
		--primary: #42a7c5;
		--radius: 8px;
		--glow: 0;
	}

	* {
		cursor: default;
		font-family: 'din-2014', sans-serif;
		user-select: none;
	}

	.material-symbols-outlined {
		font-family: 'Material Symbols Outlined', sans-serif;
	}

	#map {
		width: 100%;
		height: 100%;
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

	.sidebar {
		overflow-y: hidden;
	}

	.sidebar * {
		cursor: default !important;
	}

	.material-symbols-outlined-big {
		font-variation-settings:
			'FILL' 0,
			'wght' 400,
			'GRAD' 0,
			'opsz' 64;
	}
</style>
