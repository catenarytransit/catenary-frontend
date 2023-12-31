<script lang="ts">
	import { calculateNewCoordinates, createGeoJSONCircle, componentToHex } from '../geoMathsAssist';
	//switch to maplibre-gl soon, protomaps in the works
	import mapboxgl, { type MapboxGeoJSONFeature } from 'mapbox-gl';
	import { onMount } from 'svelte';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
	import { construct_svelte_component, run } from 'svelte/internal';
	import { addGeoRadius, setUserCircles } from '../components/userradius';
	import { hexToRgb, rgbToHsl, hslToRgb } from '../utils/colour';
	import { browser } from '$app/environment';
	import { decode as decodeToAry, encode as encodeAry } from 'base65536';
	import { LngLat } from 'maplibre-gl';
	import {interpretLabelsToCode} from '../components/rtLabelsToMapboxStyle';
	import { flatten } from '../utils/flatten';
	import { fade } from 'svelte/transition';
	import { determineFeeds } from '../maploaddata';
	import {makeCircleLayers} from '../components/addLayers/addLiveDots';
	import Layerbutton from '../components/layerbutton.svelte';
	import Realtimelabel from '../realtimelabel.svelte';
	import Layerselectionbox from '../components/layerselectionbox.svelte';
	import {numberForBearingLengthBus, numberForBearingLengthRail} from '../components/lineBasedBearing'
	import {
		what_kactus_to_use,
		what_martin_to_use,
		what_backend_to_use,
		check_kactus,
		check_backend,
		check_martin
	} from '../components/distributed';
	import Toastify from 'toastify-js'
	import {addStopsLayers} from '../components/addLayers/addStops'
	import CloseButton from '../components/CloseButton.svelte';

	import {makeBearingArrowPointers} from '../components/addLayers/makebearingarrowpointers'

	import i18n from '../i18n/strings';
	import { playRandomSequence } from '../components/announcements';
	import Alertpopup from '../components/alertpopup.svelte';
	import { addShapes } from '../components/addLayers/addShapes';
	import Artwork from '../components/artwork.svelte';
	let enabledlayerstyle =
		'text-black dark:text-white bg-blue-200 dark:bg-gray-700 border border-blue-800 dark:border-blue-200 text-sm md:text-sm';
	let disabledlayerstyle =
		'text-gray-900 dark:text-gray-50 border bg-gray-300 border-gray-400 dark:bg-gray-800  dark:border-gray-700 text-sm md:text-sm';

	let darkMode = true;

	let strings = i18n.en;

	if (typeof window !== 'undefined') {
		// @ts-expect-error
		strings = i18n[window.localStorage.language || 'en'];
	}

	//false means use metric, true means use us units
	let selectedSettingsTab = 'localrail';
	let usunits = false;
	let foamermode = false;
	let sidebarCollapsed = false;
	let sidebarView = 0;
	let announcermode = false;
	let realtime_list: string[] = [];
	let vehiclesData: Record<string, any> = {};
	//stores geojson data for currently rendered GeoJSON realtime vehicles data, indexed by realtime feed id
	let geometryObj : Record<string, any> = {};
	let lasttimeofnorth = 0;

	const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
	let debugmode = !!(urlParams.get('debug'));

	let fpsmode = !!(urlParams.get('fps'));

	let avaliablerealtimevehicles = new Set();
	let avaliablerealtimetrips = new Set();
	let avaliablerealtimealerts = new Set();
	let fetchedavaliablekactus = false;

	let static_feeds: any[] = [];

	let current_map_heading = 0;

	let operators: any[] = [];

	let realtime_feeds: any[] = [];

	let static_feeds_in_frame: Record<string, any> = {};
	let operators_in_frame: Record<string, any> = {};
	let realtime_feeds_in_frame: Record<string, any> = {};

	let lastrunmapcalc = 0;
	let mapboundingbox:number[][] = [[0,0],[0,0],[0,0],[0,0]];
	let mapboundingboxstring: String = "";

	//frame render duration in ms
	let last_render_start:number = 0;
	let frame_render_duration = 0;
	let fps = 0;
	let fps_array:number[] = [];

	const layerspercategory = {
		
		"bus": {
			"livedots": "bus",
			"labeldots": "labelbuses",
			"pointing": "busespointing",
			"pointingshell": "busespointingshell",
			"stops": "busstopscircle",
			"labelstops": "busstopslabel",
			"shapes": "busshapes",
			"labelshapes": "labelbusshapes"
		},
		"intercityrail": {
			"livedots": "intercityrail",
			"labeldots": "labelintercityrail",
			"pointing": "intercityrailpointing",
			"pointingshell": "intercityrailpointingshell",
			"stops": "intercityrailstopscircle",
			"labelstops": "intercityrailstopslabel",
			"shapes": "intercityrailshapes",
			"labelshapes": "intercityraillabelshapes"
		},
		"localrail": {
			"livedots": "localrail",
			"labeldots": "labellocalrail",
			"pointing": "localrailpointing",
			"pointingshell": "localrailpointingshell",
			"stops": "localrailstopscircle",
			"labelstops": "localrailstopslabel",
			"shapes": "localrailshapes",
			"labelshapes": "localraillabelshapes"
		},

		"other": {
			"livedots": "other",
			"labeldots": "labelother",
			"pointing": "otherpointing",
			"pointingshell": "otherpointingshell",
			"stops": "otherstopscircle",
			"labelstops": "otherstopslabel",
			"shapes": "othershapes",
			"labelshapes": "otherlabelshapes"
		}

	}

	setTimeout(() => {
		if (announcermode) {
			try {
				playRandomSequence()
			} catch {}
		}
	}, 6000)

	setInterval(() => {
		if (announcermode) {
			try {
				playRandomSequence()
			} catch {}
		}
	}, 60000)

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

	function handleFoamerModeSwitch() {
		foamermode = !foamermode;
		localStorage.setItem('foamermode', foamermode ? 'true' : 'false');
	}

	function handleAnnouncerModeSwitch() {
		announcermode = !announcermode;
		localStorage.setItem('announcermode', announcermode ? 'true' : 'false');
	}

	
	let showzombiebuses = false;

	if (browser) {
		if (localStorage.getItem('units') === 'us') {
			usunits = true;
		} else {
			usunits = false;
		}

		if (localStorage.getItem('foamermode') === 'true') {
			foamermode = true;
		} else {
			foamermode = false;
		}

		if (localStorage.getItem('fpsmode') === 'true') {
			fpsmode = true;
		} else {
			fpsmode = false;
		}
	}

	if (browser) {
		if (
			localStorage.theme === 'light' ||
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
	let route_info_lookup: any = {};
	// trip data, indexed via static_feed_id then trip_id
	let trips_per_agency: any = {};
	let layersettingsBox = false;

	const lockonconst = 14.5;

	let mapglobal: mapboxgl.Map ;
	let firstmove = false;
	let secondrequestlockgps = false;

	//	let binaryDataOfGtfsRt: any = new Object();

	let lockongps = false;
	maplng = 0;
	maplat = 0;
	mapzoom = 0;

	let rerenders_requested: string[] = [];


	let showclipboardalert = false;
	let lastclipboardtime:number = 0;

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
				speed: true
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
				speeds: false,
				signalling: false,
				electrification: false,
				gague: false,
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
		let fetchitem = localStorage.getItem(layersettingsnamestorage);
		if (fetchitem != null) {
			let cachedJsonObject = JSON.parse(fetchitem);

			if (cachedJsonObject != null) {
				layersettings = cachedJsonObject;
			}
		}
	}

	function saveCoordsToClipboard() {
		console.log('save coords')

		let textClipboard = `${strings.coordsview}: ${maplat.toFixed(5)}, ${maplng.toFixed(5)} Z: ${mapzoom.toFixed(2)}`
		if (typeof geolocation === "object") {
			textClipboard += `\nGPS: ${geolocation.coords.latitude.toFixed(5)}, ${geolocation.coords.longitude.toFixed(5)}`

			if (geolocation.coords.heading) {
				textClipboard += ` Heading: ${geolocation.coords.heading.toFixed(2)}`
			}

			if (geolocation.coords.speed) {
				textClipboard += ` Speed: ${geolocation.coords.speed.toFixed(2)} m/s  Speed: ${(3.6 * geolocation.coords.speed).toFixed(2)} km/h`
			}

			if (geolocation.coords.altitude) {
				textClipboard += ` Alt: ${geolocation.coords.altitude.toFixed(2)}`
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

	function rerenders_request(realtime_id: string) {
		//step 1, get the list of routes if it doesnt exist
		let this_realtime_feed = realtime_feeds_in_frame[realtime_id];


		console.log('processing', realtime_id, this_realtime_feed)

		//console.log('feed', realtime_id, realtime_feeds_in_frame[realtime_id])

		// console.log('139',this_realtime_feed)

		if (this_realtime_feed) {
			// console.log('this_realtime_feed',this_realtime_feed)

			let operators_for_this_realtime = this_realtime_feed.operators;

			let operators_to_render = [...new Set(operators_for_this_realtime
				.map((x: any) => operators_in_frame[x])
				.filter((x: any) => x != undefined))];

			console.log('operators_to_render', operators_to_render);

			//console.log('operators for rerender', operators_to_render);
			let big_table: any = {};
			let trips_possible_agencies: any = {};

			let static_feed_ids: Array<string> = [];

			if (this_realtime_feed === "f-横浜市-municipal-bus-rt") {
					static_feed_ids = ["f-横浜市-municipal-bus"]
				}

			if (this_realtime_feed === "f-横浜市-municipal-subway-rt") {
				static_feed_ids = ["f-横浜市-municipal-subway"]
			}

			Object.values(operators_to_render).forEach((operator: any) => {
				//attempt to pull the routes for this operator
				if (operator.gtfs_static_feeds) {
					operator.gtfs_static_feeds.forEach((static_feed_id: string) => {
						if (!static_feed_ids.includes(static_feed_id)) {

							console.log('this_realtime_feed', this_realtime_feed)

							if (!this_realtime_feed.onestop_feed_id.includes("f-横浜市")) {
							static_feed_ids.push(static_feed_id);
							static_feed_ids = [...new Set(static_feed_ids)];
							}

												//this static feed
						if (route_info_lookup[static_feed_id] == undefined) {
							fetch(what_backend_to_use() + '/getroutesperagency?feed_id=' + static_feed_id)
								.then((x) => x.json())
								.then((x) => {
									route_info_lookup[static_feed_id] = convertArrayToObject(x, 'route_id');
									rerenders_request(realtime_id);
									// console.log('saved results for this agency', static_feed_id)
								})
								.catch((e) => {
									console.error(e);
									check_backend();
								});
						} else {
							//console.log('already have results for this agency', static_feed_id)

							big_table[static_feed_id] = route_info_lookup[static_feed_id];
							trips_possible_agencies[static_feed_id] = trips_per_agency[static_feed_id];
						}
						}
					});
				}
			});

			console.log('Object.keys(big_table)', Object.keys(big_table))			

			if ([...new Set(Object.keys(big_table))].length > 0) {
				//console.log('big table has data for ', realtime_id)

				let mergetable = Object.assign({}, ...Object.values(big_table));

				let mergetabletrips = Object.assign({}, ...Object.values(trips_possible_agencies));

				console.log('vehicle data', realtime_id, vehiclesData[realtime_id])

				//render each vehicle vehiclesData[realtime_id].entity

				//console.log('mergetable', mergetable)

				let features = vehiclesData[realtime_id].entity
					.filter((entity: any) => entity.vehicle.timestamp > (Date.now() / 1000) - 300 || realtime_id === "f-amtrak~rt" || realtime_id === "f-横浜市-municipal-subway-rt" || realtime_id === "f-metrolinktrains~rt")
					.filter((entity: any) => entity.vehicle !== null && entity.vehicle !== undefined)
					.filter(
						(entity: any) =>
							entity.vehicle?.position !== null && entity.vehicle?.position !== undefined
					)
					//no vehicles older than 10 min
					//	.filter((entity: any) => entity.vehicle?.timestamp < Date.now() / 1000 - 600)
					.map((entity: any) => {

						const { id, vehicle } = entity;
						//default to bus type
						let routeType = 3;

						let colour = '#aaaaaa';

						let headsign = '';

						let routeId = vehicle?.trip?.routeId || '';
						
						let fetchTrip = false;

						if (!routeId) {
							//console.log('no route id', realtime_id, entity);
							
							fetchTrip = true;
						}


						if (routeId) {
							if (mergetable[routeId]) {
								routeType = mergetable[routeId].route_type;
								colour = mergetable[routeId].color;

								if (mergetable[routeId].color) {
									let splitInts = mergetable[routeId].color
										.replace('rgb(', '')
										.replace(')', '')
										.split(',');

									colour = rgbToHex(
										Number(splitInts[0]),
										Number(splitInts[1]),
										Number(splitInts[2])
									);
								}
							}

							if (realtime_id === 'f-metro~losangeles~bus~rt') {
								let trimmedRouteId = routeId.replace('-13172', '');
							}
						} else {
							//console.log('no route id', entity)
							if (realtime_id === 'f-metro~losangeles~bus~rt') {
								colour = '#e16710';
							}
						}

						if (['f-mta~nyc~rt~mnr','f-metrolink~rt','f-mta~nyc~rt~lirr','f-amtrak~rt'].includes(realtime_id)) {
							routeType = 2;
						}

						if (realtime_id === "f-amtrak~rt") {
							colour = '#18567d';
						}

						
						if (realtime_id == "f-metrolinktrains~rt") {
								routeType = 2;
							}

						if (routeType === 2) {
							//get trip id for intercity rail
							fetchTrip = true;
						}

						//fetchTrip = true;

						//this system sucks, honestly. Transition to batch trips info eventually
						if (fetchTrip === true) {
							//submit a tripsId requests
							//console.log('submit trip',realtime_id)

							if (realtime_id == "f-横浜市-municipal-subway-rt") {
								static_feed_ids = ["f-横浜市-municipal-subway"];
								routeType = 1;
							}

							if (realtime_id == "f-横浜市-municipal-bus-rt") {
								static_feed_ids = ["f-横浜市-municipal-bus"]
							}

							if (static_feed_ids.length === 1) {
								let static_feed_id_to_use = static_feed_ids[0];

								if (trips_per_agency[static_feed_id_to_use] == undefined) {
									trips_per_agency[static_feed_id_to_use] = {};
								}

								if (vehicle?.trip?.tripId) {
									if (
										trips_per_agency[static_feed_id_to_use][vehicle?.trip?.tripId] != undefined &&
										trips_per_agency[static_feed_id_to_use][vehicle?.trip?.tripId] != null
									) {
										//render
										if (trips_per_agency[static_feed_id_to_use][vehicle?.trip?.tripId] === null) {
											console.log('no trip info', vehicle?.trip?.tripId)
										} else {
											//get routeId from the trips table

											if (trips_per_agency[static_feed_id_to_use][vehicle.trip.tripId].route_id) {
												headsign =
													trips_per_agency[static_feed_id_to_use][vehicle.trip.tripId]
														.trip_headsign;

												if (vehicle.trip.routeId) {
													routeId = vehicle.trip.routeId;
												} else {
													routeId =
														trips_per_agency[static_feed_id_to_use][vehicle.trip.tripId].route_id;
												}

												if (mergetable[routeId]) {
													routeType = mergetable[routeId].route_type;

													if (mergetable[routeId].color) {
														let splitInts = mergetable[routeId].color
															.replace('rgb(', '')
															.replace(')', '')
															.split(',');

														colour = rgbToHex(
															Number(splitInts[0]),
															Number(splitInts[1]),
															Number(splitInts[2])
														);
													}
												}
											}
										}
									} else {
										//console.log('okay fetch then!')
										if (vehicle.trip.tripId) {
											fetch(
												`${what_backend_to_use()}/gettrip?feed_id=${static_feed_id_to_use}&trip_id=${
													vehicle.trip.tripId
												}`
											)
												.then((x) => x.json())
												.then((data) => {
													if (data.length > 0) {
														if (typeof trips_per_agency[static_feed_ids[0]] === 'undefined') {
															trips_per_agency[static_feed_ids[0]] = {};
														}

														trips_per_agency[static_feed_ids[0]][vehicle?.trip?.tripId] = data[0];
														//rerenders request
														if (!rerenders_requested.includes(realtime_id)) {
															rerenders_requested.push(realtime_id);
														}
													} else {
														trips_per_agency[static_feed_ids[0]][vehicle?.trip?.tripId] = null;
													}
												})
												.catch((e) => {
													console.error(e);
													check_backend();
												});
										}
									}
								}
							}
						}

						//colour section

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

								//console.log('newdarkhsl',newdarkhsl)

								let newdarkrgb = hslToRgb(newdarkhsl.h, newdarkhsl.s, newdarkhsl.l);
								//console.log('newdarkrgb',newdarkrgb)

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

						let maptag = routeId;

						if (realtime_id === 'f-metro~losangeles~bus~rt') {
							maptag = maptag.replace('-13172', '').replace('901', 'G');
						}

						if (realtime_id === 'f-ucla~bruinbus~rt') {
							if (mergetable[routeId]) {
								maptag = mergetable[routeId].long_name;
							} else {
								maptag = 'Bruin-No Route';
							}
						}

						if (realtime_id === 'f-横浜市-municipal-subway-rt') {
							if (mergetable[routeId]) {
								maptag = mergetable[routeId].long_name.replace("　→　","→");
							}
						}

						if (realtime_id === 'f-avalon~ca~rt') {
							if (mergetable[routeId]) {
								maptag = mergetable[routeId].long_name;
							}
						}

						let railletters: any = {};
						if (
							realtime_id === 'f-metro~losangeles~rail~rt' ||
							realtime_id === 'f-metrolinktrains~rt'
						) {
							railletters = {
								'801': 'A',
								'802': 'B',
								'803': 'C',
								'804': 'E',
								'805': 'D',
								'807': 'K',
								'Orange County Line': 'OC',
								'San Bernardino Line': 'SB',
								'Antelope Valley Line': 'AV',
								'Inland Emp.-Orange Co. Line': 'IEOC',
								'Ventura County Line': 'VC'
							};
						}

						if (
							realtime_id === 'f-northcountrytransitdistrict~rt' ||
							realtime_id === 'f-mts~rt~onebusaway'
						) {
							railletters = {
								'398': 'COASTER',
								'399': 'SPRINTER',
								'510': 'BLU',
								'520': 'ORG',
								'530': 'GRN'
							};
						}

						if (Object.keys(railletters).includes(routeId)) {
							maptag = railletters[routeId];
						}

						let tripIdLabel = vehicle?.trip?.tripId || '';

						if (vehicle?.trip?.tripId) {
							if (mergetabletrips[vehicle?.trip?.tripId]) {
								tripIdLabel = mergetabletrips[vehicle?.trip?.tripId].trip_short_name;
							}
						}

						if (realtime_id === 'f-mta~nyc~rt~lirr') {
							let temp1 = tripIdLabel.split('_');
							tripIdLabel = temp1[temp1.length - 1];
						}

						if (realtime_id === 'f-横浜市-municipal-subway-rt') {
							if (vehicle?.trip?.tripId) {
								tripIdLabel = vehicle?.trip?.tripId.slice(2).toUpperCase();
							}
								
							
						}

						if (mergetable[routeId]) {
							if (mergetable[routeId].short_name) {
								maptag = mergetable[routeId].short_name;
							} else {
								if (mergetable[routeId.long_name]) {
									maptag = mergetable[routeId].long_name;
									console.log('overruled as long name', maptag);
								}
							}

							if (realtime_id === 'f-mta~nyc~rt~mnr' || realtime_id === 'f-mta~nyc~rt~lirr') {
								maptag = mergetable[routeId].long_name.replace(/branch/gi, '').trim();
							}

							
						
							if (realtime_id === 'f-amtrak~rt') {
								maptag = mergetable[routeId].long_name;
							}
						}


						maptag = maptag.replace(/( )?Line/, '');

						maptag = maptag.replace(/counterclockwise/i, '-ACW').replace(/clockwise/i, '-CW');

						//let tripIdLabel = vehicle?.trip?.tripId;

						let vehiclelabel = vehicle?.vehicle?.label || vehicle?.vehicle?.id || '';

						if (realtime_id === 'f-mta~nyc~rt~bustime') {
							vehiclelabel = vehiclelabel.replace(/mta( )?/i, '');
						}

						//go here https://github.com/kylerchin/catenary-frontend/blob/075f1a0cc355303c02a4ccda62e0eece494ad03e/src/routes/%2Bpage.svelte
						//line 1000
						return {
							type: 'Feature',
							properties: {
								//shown to user directly?
								vehicleIdLabel: vehiclelabel,
								//maintain metres per second, do conversion in label
								speed: vehicle?.position?.speed,
								color: colour,
								//int representing enum
								routeType: routeType,
								//keep to gtfs lookup
								tripIdLabel: tripIdLabel,
								//keep to degrees as gtfs specs
								bearing: vehicle?.position?.bearing,
								maptag: maptag,
								contrastdarkmode: contrastdarkmode,
								contrastdarkmodebearing,
								routeId: routeId,
								headsign: headsign
							},
							geometry: {
								type: 'Point',
								coordinates: [vehicle.position.longitude, vehicle.position.latitude]
							}
						};
					});

				const getbussource = mapglobal.getSource('buses');
				const getintercityrailsource = mapglobal.getSource('intercityrail');
				const getlocalrailsource = mapglobal.getSource('localrail');
				const othersource = mapglobal.getSource('other');

				console.log(
					'made features', features
				)

				geometryObj[realtime_id] = features;

				console.log(geometryObj);

				let flattenedarray = flatten(Object.values(geometryObj));

				if (typeof getbussource != 'undefined') {
					getbussource.setData({
						type: 'FeatureCollection',
						features: flattenedarray.filter((x: any) => x.properties.routeType === 3 || x.properties.routeType === 11)
					});

					if (typeof getintercityrailsource != 'undefined') {
						getintercityrailsource.setData({
							type: 'FeatureCollection',
							features: flattenedarray.filter((x: any) => x.properties.routeType == 2)
						});
					}

					if (typeof getlocalrailsource != 'undefined') {
						getlocalrailsource.setData({
							type: 'FeatureCollection',
							features: flattenedarray.filter((x: any) => [0,1,5,12].includes(x.properties.routeType))
						});
					}

					if (typeof othersource != 'undefined') {
						othersource.setData({
							type: 'FeatureCollection',
							features: flattenedarray.filter((x: any) => [4,6,7].includes(x.properties.routeType))
						});
					}
				}
			}
		}
	}

	function getBoundingBoxMap():number[][] {
		let start = performance.now();

		const canvas = mapglobal.getCanvas(),
  		w:number = canvas.width,
  	h:number = canvas.height;

  	const cUL = mapglobal.unproject([0,0]).toArray(),
  	cUR = mapglobal.unproject([w,0]).toArray(),
  	cLR = mapglobal.unproject([w,h]).toArray(),
  	cLL = mapglobal.unproject([0,h]).toArray();

  	var coordinates = [cUL,cUR,cLR,cLL,cUL];

	console.log('getBoundingBoxMap', performance.now() - start);

	//console.log(coordinates);

	return coordinates;
	}

	function runSettingsAdapt() {
		 console.log('run settings adapt', layersettings);
		if (mapglobal) {
			if (foamermode) {
				mapglobal.setLayoutProperty('foamershapes', 'visibility', 'visible');
			} else {
				mapglobal.setLayoutProperty('foamershapes', 'visibility', 'none');
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

					if (category === "other") {
						if (this_layer_settings.shapes) {
							mapglobal.setLayoutProperty('ferryshapes', 'visibility', 'visible');
						} else {
							mapglobal.setLayoutProperty('ferryshapes', 'visibility', 'none');
						}
					}
				} else {
					console.log('could not fetch shapes layer', category)
				}

				let stoplayer = mapglobal.getLayer(categoryvalues.stops);
				if (stoplayer) {
					if (this_layer_settings.stops) {
						mapglobal.setLayoutProperty(categoryvalues.stops, 'visibility', 'visible');
					} else {
						mapglobal.setLayoutProperty(categoryvalues.stops, 'visibility', 'none');
					}
				} else {
					console.log('no stop layer found for',category)
				}
				
				let stopslabellayer = mapglobal.getLayer(categoryvalues.labelstops);
					if (stopslabellayer) {
						if (this_layer_settings.stoplabels) {
						mapglobal.setLayoutProperty(categoryvalues.labelstops, 'visibility', 'visible');
					} else {
						mapglobal.setLayoutProperty(categoryvalues.labelstops, 'visibility', 'none');
					}
					} else {
						console.log('no stops label layer found for ', category)
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
					[categoryvalues.pointing,categoryvalues.pointingshell].forEach((x) => {
					mapglobal.setLayoutProperty(x, 'visibility', 'visible');
					})
				} else {
					mapglobal.setLayoutProperty(categoryvalues.livedots, 'visibility', 'none');
					mapglobal.setLayoutProperty(categoryvalues.labeldots, 'visibility', 'none');
					[categoryvalues.pointing,categoryvalues.pointingshell].forEach((x) => {
					mapglobal.setLayoutProperty(x, 'visibility', 'none');
					})
				}
			} else {
				if (dotcirclelayer == null) {
					console.log('could not fetch dotcirclelayer', category)
				}
				if (dotlabel == null) {
					console.log('could not fetch dotlabel', category)
				}
			}

			let hidevehiclecommand = ['!=', '', ['get', 'tripIdLabel']];

		let regularpointers = ["!=", 0, ['get', 'bearing']];
		let hidevehiclecommandpointers = ['all', ['!=', '', ['get', 'tripIdLabel']], ["!=", 0, ['get', 'bearing']]];

			if (dotcirclelayer) {
				if (showzombiebuses === true) {
				mapglobal.setFilter(categoryvalues.livedots, undefined);
				mapglobal.setFilter(categoryvalues.labeldots, undefined);
				mapglobal.setFilter(categoryvalues.pointing, regularpointers);
				mapglobal.setFilter(categoryvalues.pointingshell, regularpointers)
				} else 
{
	mapglobal.setFilter(categoryvalues.livedots, hidevehiclecommand);
	mapglobal.setFilter(categoryvalues.labeldots, hidevehiclecommand);
	mapglobal.setFilter(categoryvalues.pointing, hidevehiclecommandpointers);
	mapglobal.setFilter(categoryvalues.pointingshell, hidevehiclecommandpointers)

}			}

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

	onMount(() => {
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

		let style = darkMode
			? 'mapbox://styles/kylerschin/clqogkdiy00bs01obh352h32o'
			: 'mapbox://styles/kylerschin/clqomei1n006h01raaylca7ty';

		if (browser) {
			if (window.localStorage.mapStyle == 'sat') {
				style = 'mapbox://styles/kylerschin/clncqfm5p00b601recvp14ipu';
			}
			if (window.localStorage.mapStyle == 'classic') {
				style = darkMode
					? 'mapbox://styles/kylerschin/clm2i6cmg00fw01of2vp5h9p5'
					: 'mapbox://styles/kylerschin/cllpbma0e002h01r6afyzcmd8';
			}
			if (window.localStorage.mapStyle == 'archi') {
				style = 'mapbox://styles/kylerschin/clqpdas5u00c801r8anbdf6xl';
			}
			if (window.localStorage.mapStyle == 'minimal') {
				style = 'mapbox://styles/kylerschin/clqpxwqw700bs01rjej165jc7';
			}
		}

		const map = new mapboxgl.Map({
			container: 'map',
			crossSourceCollisions: true,
			hash: 'pos',
			useWebGL2: true,
			preserveDrawingBuffer: false,
			//	antialias: true,
			style: style, // stylesheet location
			accessToken: decode(
						'ꉰ騮罹縱𒁪险ꌳ轳罘蹺鴲靰繩繳穭葩罩陪筪陳繪輰艈艷繄艺筮陷荘靨ꍄ荲鵄繫敮謮轤𔕰𖥊浊豧扁缭𠁎詫鐵ᕑ'
				  ),
			center: centerinit, // starting position [lng, lat]
			//keep the centre at Los Angeles, since that is our primary user base currently
			//switch to IP geolocation and on the fly rendering for this soon
			zoom: zoominit, // starting zoom (must be greater than 8.1)
			fadeDuration: 0
		});

		mapboxgl.setRTLTextPlugin(
		'/mapbox-gl-rtl-text.min.js',
		(err) => {
			console.error(err)
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

		//on hover
		map.on('mousemove', 'busshapes', (events) => {
			//console.log('hoverfea', events.features);
		});

		map.on('mousemove', 'railshapes', (events) => {
			//	console.log('hoverfea-rail', events.features);
		});

		map.on('mousemove', 'buses', (events) => {
			//console.log('hover over realtime bus', events.features)
		});

		map.on('moveend', (events) => {
			let feedresults = determineFeeds(map, static_feeds, operators, realtime_feeds, geolocation);
			//	console.log('feedresults', feedresults)

			static_feeds_in_frame = feedresults.static_data_obj;
			operators_in_frame = feedresults.operators_data_obj;
			realtime_feeds_in_frame = feedresults.realtime_feeds_data_obj;
			realtime_list = feedresults.r;
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
		})

		map.on('zoomend', (events) => {
			let feedresults = determineFeeds(map, static_feeds, operators, realtime_feeds, geolocation);

			//console.log('feedresults', feedresults)

			static_feeds_in_frame = feedresults.static_data_obj;
			operators_in_frame = feedresults.operators_data_obj;
			realtime_feeds_in_frame = feedresults.realtime_feeds_data_obj;
			realtime_list = feedresults.r;
		});

		function fetchKactus() {
			let avaliablerealtimevehicles_temp = new Set();
			let avaliablerealtimetrips_temp = new Set();
			let avaliablerealtimealerts_temp = new Set();

			if (fetchedavaliablekactus === false) {
				fetch(what_kactus_to_use() + '/gtfsrttimes')
					.then((x) => x.json())
					.then((feeds: any) => {
						feeds.forEach((feed: any) => {
							if (feed.vehicles != null) {
								avaliablerealtimevehicles_temp.add(feed.feed);
							}
							if (feed.trips != null) {
								avaliablerealtimetrips_temp.add(feed.feed);
							}
							if (feed.alerts != null) {
								avaliablerealtimealerts_temp.add(feed.feed);
							}
						});

						avaliablerealtimevehicles = avaliablerealtimevehicles_temp;
						avaliablerealtimetrips = avaliablerealtimetrips_temp;
						avaliablerealtimealerts = avaliablerealtimealerts_temp;
						fetchedavaliablekactus = true;
					})
					.catch((error) => {
						console.error(error);

						check_kactus();
					});
			}
		}

		fetchKactus();

		function clearbottomright() {
			let bottomright = document.getElementsByClassName('mapboxgl-ctrl-bottom-right');

				if (bottomright) {
					if (bottomright[0] != undefined) {
						bottomright[0].remove();
					}
				}

				//console.log('requested rerender of ', rerenders_requested)
		}

		function process_request_for_rerender() {
			if (rerenders_requested.length > 0) {
					[...new Set(rerenders_requested)].forEach((x) => {
						console.log('rerender automatic', x);
						rerenders_request(x);
					});
					rerenders_requested = [];
				}
		}

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
			runSettingsAdapt()
		}

			addGeoRadius(map);
			if (debugmode) {
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
						'line-width': 1.5
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
						'line-width': 1
					},
					minzoom: 7
				});
			}

			fetchKactus();

			map.addSource('static_feeds', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			fetch(what_backend_to_use() + '/getinitdata')
				.then(async (x) => await x.json())
				.then((x) => {
					static_feeds = x.s;
					operators = x.o;
					let temp_rt=  x.r;
					temp_rt.push({
						onestop_feed_id: "f-amtrak~rt",
						operators: ['o-9q-amtrakcalifornia','o-9-amtrak','o-9-amtrak~amtrakcalifornia~amtrakcharteredvehicle-southeastareatransit']
					})
					realtime_feeds = temp_rt;
				})
				.catch((e) => {
					console.error(e);
					check_backend();
				});

			updateData();

			map.addSource('static_feeds_hull', {
				type: 'vector',
				url: `${what_martin_to_use()}/static_feeds`
			});

			map.addLayer({
				id: 'static_hull_calc',
				type: 'fill',
				source: 'static_feeds_hull',
				'source-layer': 'static_feeds',
				paint: {
					'fill-color': '#0055aa',
					'fill-opacity': 0
				}
			});

			if (urlParams.get('debug')) {
				map.addLayer({
					id: 'static_hull_calc_line',
					type: 'line',
					'source-layer': 'static_feeds',

					source: 'static_feeds_hull',
					paint: {
						'line-color': '#22aaaa',
						'line-opacity': 1
					}
				});

				map.addLayer({
					id: 'static_feed_calc_names',
					type: 'symbol',
					source: 'static_feeds_hull',
					'source-layer': 'static_feeds',
					layout: {
						'text-field': ['get', 'onestop_feed_id'],
						'text-size': 8,
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
						'text-halo-color': '#0000aa',
						'text-halo-width': 1,
						'text-halo-blur': 1
					}
				});
			}

			/*
			map.addSource('shapes', {
				type: 'vector',
				url: 'https://martin.catenarymaps.org/shapes'
			});*/

			map.addSource('notbusshapes', {
				type: 'vector',
				url: what_martin_to_use() + '/notbus'
			});

			map.addSource('busshapes', {
				type: 'vector',
				url: what_martin_to_use() + '/busonly'
			});

			map.addSource('busstops', {
				type: 'vector',
				url: what_martin_to_use() + '/busstops'
			});

			map.addSource('stationfeatures', {
				type: 'vector',
				url: what_martin_to_use() + '/stationfeatures'
			});

			map.addSource('railstops', {
				type: 'vector',
				url: what_martin_to_use() + '/railstops'
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

			map.addLayer({
				id: 'foamershapes',
				type: 'raster',
				source: 'foamertiles'
			});

			map.addLayer({
				id: 'ferryshapes',
				type: 'line',
				source: 'notbusshapes',
				'source-layer': 'notbus',
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

			map.loadImage("/station-enter.png", (error, image) => {
				if (error) throw error;

				map.addImage('station-enter', image);

				map.addLayer({
					id: 'stationenter',
					type: 'symbol',
					source: 'stationfeatures',
					filter: ['all', ['==', 2, ['get','location_type']]],
					"source-layer": "stationfeatures",
					layout: {
						'icon-image': "station-enter",
						"icon-size": ['interpolate', ['linear'],['zoom'], 14, 0.2, 15, 0.2, 16, 0.25, 18, 0.4],
						'icon-ignore-placement': false,
						'icon-allow-overlap': true,
					},
					
				minzoom: window?.innerWidth >= 1023 ? 14 : 15
				},layerspercategory.bus.stops);

				map.addLayer({
				id: 'stationenterlabel',
				filter: ['all', ['==', 2, ['get','location_type']]],
				type: 'symbol',
					source: 'stationfeatures',
					"source-layer": "stationfeatures",
					
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
					'text-halo-width': darkMode ? 0.4 : 0.2
				},
				minzoom: window?.innerWidth >= 1023 ? 17.5 : 17
			},layerspercategory.bus.stops);
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

			makeBearingArrowPointers(map, darkMode, layerspercategory);

			makeCircleLayers(map, darkMode, layerspercategory);

			runSettingsAdapt();

			setInterval(() => {
				if (map.getZoom() >= 8) {
					realtime_list.forEach((realtime_id: string) => {
						let url = `${what_kactus_to_use()}/gtfsrt/?feed=${realtime_id}&category=vehicles`;

						if (rtFeedsTimestampsVehicles[realtime_id] != undefined) {
							url = url + '&timeofcache=' + rtFeedsTimestampsVehicles[realtime_id];
						}

						if (rtFeedsHashVehicles[realtime_id] != undefined) {
							url = url + '&bodyhash=' + rtFeedsHashVehicles[realtime_id];
						}

						let listhas = true;

						if (fetchedavaliablekactus == true && !avaliablerealtimevehicles.has(realtime_id)) {
							listhas = false;
						}

						if (!realtime_id.includes('alerts') && listhas == true) {
							fetch(url)
								.then(async (response) => {
									if (response.status === 200) {
										//console.log('hash for', agency_obj.feed_id, " is ",  response.headers.get('hash'))

										//console.log(response.headers)

										rtFeedsHashVehicles[realtime_id] = response.headers.get('hash');

										return await response.arrayBuffer();
									} else {
										return null;
									}
								})
								.then((buffer) => {
									if (buffer != null) {
										const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
											new Uint8Array(buffer)
										);

										console.log('buffer decoded for', realtime_id)

										rtFeedsTimestampsVehicles[realtime_id] = feed.header.timestamp;

										vehiclesData[realtime_id] = feed;
										rerenders_request(realtime_id);
									}
								})
								.catch((e) => {
									check_kactus();
									check_backend();
								});
						}
					});

					Object.keys(vehiclesData).forEach((vehiclesDataCheckCleanUp) => {
						if (!realtime_list.includes(vehiclesDataCheckCleanUp)) {
							//console.log('delete gtfsrt', vehiclesDataCheckCleanUp);
							delete vehiclesData[vehiclesDataCheckCleanUp];
						}
					});
				}
			}, 600);

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
					'fill-opacity': ['get', 'opacity']
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
						'icon-opacity': 0.8
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
						'icon-opacity': 0.8
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

			setTimeout(() => {
				let feedresults = determineFeeds(map, static_feeds, operators, realtime_feeds, geolocation);
			//	console.log('feedresults', feedresults)

			static_feeds_in_frame = feedresults.static_data_obj;
			operators_in_frame = feedresults.operators_data_obj;
			realtime_feeds_in_frame = feedresults.realtime_feeds_data_obj;
			realtime_list = feedresults.r;
			}, 1000);

		});

		function runBoxCalc() {
			
				
				mapboundingbox = getBoundingBoxMap();
	
				//console.log('mapboundingbox',mapboundingbox)
	
					if (debugmode) {
						mapboundingboxstring = mapboundingbox.map((x) => `${x[1].toFixed(4)},${x[0].toFixed(4)}`).join("/")
					}
				}
		

		map.on('move', () => {
			updateData();
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

			
			process_request_for_rerender()
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

							let geojsondata:any = createGeoJSONCircle(
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
	<link rel="icon" href="/logo.png" />
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
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
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

{#key showclipboardalert}
<div
out:fade={{duration: 400}}
class={`fixed bottom-10 left-4 md:right-20 md:left-auto rounded-full px-3 py-1 text-sm ${showclipboardalert === true ? "" : "hidden"}  pointer-events-none bg-blue-200 text-black dark:bg-blue-900 dark:text-white bg-opacity-80 dark:bg-opacity-80`}>
	{strings.coordscopied}
</div>
{/key}

<div class="fixed bottom-0 right-0 text-xs md:text-sm pointer-events-none bg-gray-50 text-gray-900 dark:bg-zinc-900 bg-opacity-70 dark:bg-opacity-70 dark:text-gray-50 pointer-events-auto select-none clickable"
on:click={() => {
	saveCoordsToClipboard()
}}
on:keydown={() => {
	saveCoordsToClipboard()
}}
>
	<p>
		{#if debugmode == true}
			{mapboundingboxstring}
			<span class='inline md:hidden'><br/></span>
		{/if}

		{#if fpsmode == true}
			<span class='inline text-yellow-800 dark:text-yellow-200'>FPS: {fps.toFixed(0)} | render time: {frame_render_duration.toFixed(2)} ms</span>
			<span class='inline md:hidden'><br/></span>
		{/if}
		{strings.coordsview}: {maplat.toFixed(5)}, {maplng.toFixed(5)} Z: {mapzoom.toFixed(2)} 
		<span><br class='inline md:hidden'/></span>
	{#if typeof geolocation === 'object'}
		<span class='text-blue-700 dark:text-green-300'>GPS: {geolocation.coords.latitude.toFixed(5)}, 
		{geolocation.coords.longitude.toFixed(5)}
		{#if typeof geolocation.coords.heading === 'number'}
		{geolocation.coords.heading.toFixed(0)}°
		{/if}
		{#if typeof geolocation.coords.altitude === 'number'}
		| {geolocation.coords.altitude.toFixed(0)} m
		{/if}
		{#if typeof geolocation.coords.speed === 'number'}
				{#if usunits == false}
					| {geolocation.coords.speed.toFixed(2)} m/s ({(3.6 * geolocation.coords.speed).toFixed(2)} km/h)
				{:else}
					| {(2.23694 * geolocation.coords.speed).toFixed(2)} mph
				{/if}
		{/if}
	</span>
	{/if}
</p>
</div>

{#if sidebarCollapsed == false}
	<div
		class="fixed top-0 left-0 pointer-events-none text-white pointer-events-auto z-50 clickable lg:w-[25vw] w-[100vw] h-[100vh] backdrop-blur-sm"
		style:background={darkMode ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.4)"}
		style:color={`${darkMode ? 'white' : 'black'}`}
		style:border-image-source="linear-gradient(to bottom, #42A7C5, #0A233F)"
		style:border-image-slice="1"
		style:border-right="5px solid"
		style:padding="20px"
		style:overflow="auto"
	>
		<div class="mt-16"></div>
		{#if sidebarView == 0}
			<Alertpopup background="linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(https://art.metro.net/wp-content/uploads/2021/08/featured-highlandpark-1200x800-1.jpeg) top center no-repeat, black">
				<h1 class="text-lg font-bold">{strings.appwidealert}</h1>
				<p class="text-sm">{strings.appwidesubtext}</p>
			</Alertpopup>
			{#if realtime_list.includes('f-metro~losangeles~bus~rt')}
			<Alertpopup background="linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0)), url(https://art.metro.net/wp-content/uploads/2021/08/feature-chatsworth-1200x800-1.jpeg) bottom center no-repeat, black">
				<h1 class="text-lg">{strings.alertheaderla}</h1>
				<p class="text-sm">{strings.alertsubtextla}</p>
				<a style:cursor="pointer" style:color="#f9e300" href="https://art.metro.net/category/artworks/exhibitions/tteoa/">{strings.learnmore} &rarr;</a>
				<br /><br /><br /><br /><br /><br />
			</Alertpopup>
			{/if}
			{#if realtime_list.includes('f-mts~rt~onebusaway')}
			<Alertpopup background="linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(https://www.sandag.org/-/media/SANDAG/Main-Heros/regional-plan/regional-plan-landing.png) center center no-repeat, black">
				<h1 class="text-lg">{strings.alertheadersd}</h1>
				<p class="text-sm">{strings.alertsubtextsd}</p>
				<a style:cursor="pointer" style:color="#f9e300" href="https://sandag.org/transitfarestudy">{strings.learnmore} &rarr;</a>
			</Alertpopup>
			{/if}
		{/if}
		{#if sidebarView == 1}
			<h1 class="text-3xl">{strings.settings}</h1>
			<div>
				<input
					on:click={(x) => {
						handleUsUnitsSwitch();
		
						runSettingsAdapt();
					}}
					on:keydown={(x) => {
						handleUsUnitsSwitch();
						runSettingsAdapt();
					}}
					checked={usunits}
					id="us-units"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="us-units" class="ml-2">{strings.useUSunits}</label>
			</div>
		
			<div>
				<input
					on:click={(x) => {
						fpsmode = !fpsmode;
						localStorage.setItem('fpsmode', String(fpsmode));
					}}
					on:keydown={(x) => {
						fpsmode = !fpsmode;
						localStorage.setItem('fpsmode', String(fpsmode));
					}}
					checked={fpsmode}
					id="FPS"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="FPS" class="ml-2">{strings.showFPS}</label>
			</div>
			
			<div>
				<input
					on:click={(x) => {
						handleAnnouncerModeSwitch();
						runSettingsAdapt();
					}}
					on:keydown={(x) => {
						handleAnnouncerModeSwitch();
						runSettingsAdapt();
					}}
					checked={announcermode}
					id="announcements"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="announcements" class="ml-2">{strings.announcements}</label>
			</div>
		
		
			<div>
				<select
					id="languageSelect"
					name="languageSelect"
					style="color: black;"
					on:change={() => {
						// @ts-expect-error
						let language = document.querySelector('#languageSelect').value;
						if (language !== 'none') {
							document.querySelector('html')?.setAttribute('lang', language);
							// @ts-expect-error
							strings = i18n[language];
							window.localStorage.setItem('language', language);
						}
					}}
				>
					<option value="none">--</option>
					<option value="en">English</option>
					<option value="fr">Français</option>
					<option value="es">Español</option>
					<option value="ko">한국어</option>
					<option value="zh_CN">简体中文</option>
					<option value="zh_TW">繁體中文</option>
				</select>
				<label for="languageSelect" class="ml-2">{strings.language}</label>
			</div>

			<div>
				<select
					id="styleSelect"
					name="styleSelect"
					style="color: black;"
					on:change={() => {
						// @ts-expect-error
						let mapStyle = document.querySelector('#styleSelect').value;
						if (mapStyle !== 'none') {
							window.localStorage.setItem('mapStyle', mapStyle);
							window.location.reload();
						}
					}}
				>
					<option value="none">--</option>
					<option value="default">{strings.styledefault}</option>
					<option value="classic">{strings.styleclassic}</option>
					{#if browser}
						{#if window.location.search.includes('sat')}
							<option value="sat">{strings.stylesat}</option>
						{/if}
					{/if}
					<option value="minimal">{strings.styleminimal}</option>
					<option value="archi">{strings.stylearchi}</option>
				</select>
				<label for="styleSelect" class="ml-2">{strings.mapstyle}</label>
			</div>
		
			{#if foamermode}
				<br />
				Data:
				<a
					style="text-decoration:underline;cursor:pointer"
					href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a
				>
				<a style="text-decoration:underline;cursor:pointer" href='https://www.mapbox.com/about/maps/'>© Mapbox</a>
				<br />Style:
				<a
					style="text-decoration:underline;cursor:pointer"
					href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a
				> <a href="http://www.openrailwaymap.org/">OpenRailwayMap</a>
			{/if}
		{/if}
		{#if sidebarView == 9999}
			<h1 class="text-3xl">{strings.art}</h1>
			<Artwork image='https://art.metro.net/wp-content/uploads/2021/08/LongBeach-I-105.jpeg' name='Celestial Chance' artist='Sally Weber' description='Artist Sally Weber designed “Celestial Chance” for Long Beach Blvd. Station to explore traditional and contemporary visions of the sky.' />
			<Artwork image='https://art.metro.net/wp-content/uploads/2021/07/Susan-Logoreci_Right-Of-Way.jpeg' name='Right Above The Right-Of-Way' artist='Susan Logoreci' description='Just as this aerial station provides views of the surrounding areas, the artworks present aerial views of local neighborhoods, depicted in an intricate series of colored pencil drawings. Drawn from photographs that were shot from a helicopter hovering above the city, the images present the structured landscape of the area punctuated with identifiable landmarks.' />
			<Artwork image='https://art.metro.net/wp-content/uploads/2021/08/feature-tree-califas-1200x800-1.jpg' name='Tree of Califas' artist='Margaret Garcia' description='Adjacent to the historic site of the Campo de Cahuenga where in 1847 Mexico relinquished control of California to the United States in the Treaty of Cahuenga, Tree of Califas draws its title from the the mythological black Amazon queen Califas who was said to have ruled a tribe of women warriors and after whom the Spaniards named California.' />
			<Artwork image='https://art.metro.net/wp-content/uploads/2022/12/Phung-Huynh-Allegorical-Portal-to-the-City-Within-a-City-A.png' name='Allegorical Portal to the City Within a City' artist='Phung Huynh' description='Phung Huynh explores the origin story of Century City through her unique approach of urban folklore and community voices. The artwork will include portraits of recognizable actors from the area’s early history as a film studio back lot and renowned architects who built Century City, as well as everyday people who work and own businesses in the area.' />
		{/if}
		<!-- <input
			type="text"
			style:cursor="pointer !important"
			class="absolute right-4 top-4 !cursor-pointer bg-white select-none z-50 h-10 rounded-lg pl-3 dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
			placeholder={strings.search}
		/> -->
		<a
			on:click={() => { sidebarCollapsed = true }}
			style:cursor="pointer !important"
			class="fixed left-4 top-4 !cursor-pointer bg-white select-none z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
		>
			<span class="material-symbols-outlined margin-auto select-none"> left_panel_close </span>
		</a>
		<a
			on:click={() => { sidebarView = 0 }}
			style:cursor="pointer !important"
			class="absolute left-16 top-4 !cursor-pointer bg-white select-none z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
		>
			<span class="material-symbols-outlined margin-auto select-none"> home </span>
		</a>
		<a
			on:click={() => { sidebarView = 1 }}
			style:cursor="pointer !important"
			class="absolute left-28 top-4 !cursor-pointer bg-white select-none z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
		>
			<span class="material-symbols-outlined margin-auto select-none"> settings </span>
		</a>
		<!-- <a
			on:click={() => { sidebarView = 0 }}
			style:cursor="pointer !important"
			class="absolute left-28 top-4 !cursor-pointer bg-white select-none z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
		>
			<span class="material-symbols-outlined margin-auto select-none"> layers </span>
		</a> -->
	</div>
{/if}

{#if sidebarCollapsed}
<a
			on:click={() => { sidebarCollapsed = false }}
			style:cursor="pointer !important"
			class="fixed left-4 top-4 !cursor-pointer bg-white select-none z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
		>
			<span class="material-symbols-outlined margin-auto select-none"> left_panel_open </span>
		</a>
{/if}

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
</div>

<div
	class="fixed bottom-0 w-full rounded-t-lg sm:w-fit sm:bottom-4 sm:right-4 bg-yellow-50 dark:bg-gray-900 dark:text-gray-50 bg-opacity-90 dark:bg-opacity-90 sm:rounded-lg z-50 px-3 py-2 {layersettingsBox
		? ''
		: 'hidden'}"
>
<div class='flex flex-row align-middle'><h2 class='font-bold text-gray-800 dark:text-gray-200'>Layers</h2> <div class='ml-auto'><CloseButton
	onclose={() => {layersettingsBox = false}}
	moreclasses=""
	parentclass=''
	/></div></div>
	<div class="rounded-xl mx-0 my-2 flex flex-row w-full text-black dark:text-white">
		
		<Layerselectionbox text={strings.headingIntercityRail}
		changesetting={() => {
			selectedSettingsTab = 'intercityrail';
		}}
		cssclass={`${
			selectedSettingsTab === 'intercityrail' ? enabledlayerstyle : disabledlayerstyle
		} w-1/2 py-1 px-1`}
		/>

		<Layerselectionbox text={strings.headingLocalRail}
		changesetting={() => {
			selectedSettingsTab = 'localrail';
		}}
		cssclass={`${
			selectedSettingsTab === 'localrail' ? enabledlayerstyle : disabledlayerstyle
		} w-1/2 py-1 px-1`}
		/>

		<Layerselectionbox text={strings.headingBus}
		changesetting={() => {
			selectedSettingsTab = 'bus';
		}}
		cssclass={`${
			selectedSettingsTab === 'bus' ? enabledlayerstyle : disabledlayerstyle
		} w-1/2 py-1 px-1`}
		/>

		<Layerselectionbox text={strings.headingOther}
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
			
	<div>
		<input
			on:click={(x) => {
				handleFoamerModeSwitch();
				runSettingsAdapt();
			}}
			on:keydown={(x) => {
				handleFoamerModeSwitch();
				runSettingsAdapt();
			}}
			checked={foamermode}
			id="foamermode"
			type="checkbox"
			class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
		/>
		<label for="foamermode" class="ml-2">{strings.orminfra}</label>
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

	{#if ["other", "bus", 'intercityrail', 'localrail'].includes(selectedSettingsTab)}
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
				urlicon="/stoplabels.svg"
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
			<!--
			<Realtimelabel
			bind:layersettings
			bind:selectedSettingsTab
			change="headsign"
			name="Headsign"
			symbol="sports_score"
			{runSettingsAdapt}
		/>-->

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
		--primary: #79bd43;
		--radius: 8px;
		--glow: 0;
	}

	* {
		cursor: default;
		font-family: 'Satoshi-Variable', sans-serif;
	}

	.material-symbols-outlined {
		font-family: 'Material Symbols Outlined', sans-serif;
	}

	#map {
		width: 100%;
		height: 100%;
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
		font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 64;
	}
</style>
