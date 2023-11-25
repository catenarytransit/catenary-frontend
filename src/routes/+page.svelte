<script lang="ts">
	import { calculateNewCoordinates, createGeoJSONCircle, componentToHex } from '../geoMathsAssist';
	//switch to maplibre-gl soon, protomaps in the works
	import mapboxgl, { type MapboxGeoJSONFeature } from 'mapbox-gl';
	import { onMount } from 'svelte';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
	import { construct_svelte_component, run } from 'svelte/internal';
	import { addGeoRadius, setUserCircles } from '../components/georadius';
	import { hexToRgb, rgbToHsl, hslToRgb } from '../utils/colour';
	import { browser } from '$app/environment';
	import { decode as decodeToAry, encode as encodeAry } from 'base65536';
	import { LngLat } from 'maplibre-gl';
	import {interpretLabelsToCode} from '../components/rtLabelsToMapboxStyle';
	import { flatten } from '../utils/flatten';
	import { determineFeeds } from '../maploaddata';
	import {makeCircleLayers} from '../components/makeCircleLayers';
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

	import {makeBearingArrowPointers} from '../components/makebearingarrowpointers'

	import i18n from '../i18n/strings';
	import { playRandomSequence } from '../components/announcements';
	import Alertpopup from '../components/alertpopup.svelte';

	let enabledlayerstyle =
		'text-black dark:text-white bg-blue-200 dark:bg-gray-700 border border-blue-800 dark:border-blue-200';
	let disabledlayerstyle =
		'text-gray-900 dark:text-gray-50 border bg-gray-300 border-gray-300 dark:bg-gray-800  dark:border-gray-800';

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
	let announcermode = false;
	let realtime_list: string[] = [];
	let vehiclesData: any = {};
	//stores geojson data for currently rendered GeoJSON realtime vehicles data, indexed by realtime feed id
	let geometryObj: any = {};
	let lasttimeofnorth = 0;

	let alertPopupShown = true;

	let avaliablerealtimevehicles = new Set();
	let avaliablerealtimetrips = new Set();
	let avaliablerealtimealerts = new Set();
	let fetchedavaliablekactus = false;

	let static_feeds: any[] = [];

	let current_map_heading = 0;

	let operators: any[] = [];

	let realtime_feeds: any[] = [];

	let static_feeds_in_frame: any = {};
	let operators_in_frame: any = {};
	let realtime_feeds_in_frame: any = {};

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

	function processUrlLimit(inputarray: any) {
		const urlParams = new URLSearchParams(window.location.search);

		if (urlParams.get('limitfeed')) {
			inputarray.push(['==', ['get', 'onestop_feed_id'], urlParams.get('limitfeed')]);

			return inputarray;
		} else {
			return inputarray;
		}
	}

	function removeWeekends(inputarray: any[]) {
		//if it is currently a weekend in california

		let result = inputarray;

		let dayinla = new Date(
			new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
		).getDay();

		if (dayinla == 6 || dayinla == 0) {
			result.push(['!=', ['get', 'onestop_feed_id'], 'f-anteaterexpress']);
			result.push([
				'!',
				[
					'all',
					['==', ['get', 'onestop_feed_id'], 'f-9mu-orangecountytransportationauthority'],
					[
						'any',
						['==', ['coalesce', ['get', 'route_label']], '167'],
						['==', ['coalesce', ['get', 'route_label']], '473'],
						['==', ['coalesce', ['get', 'route_label']], '178'],
						['==', ['coalesce', ['get', 'route_label']], '86'],
						['==', ['coalesce', ['get', 'route_label']], '401'],
						['==', ['coalesce', ['get', 'route_label']], '400'],
						['==', ['coalesce', ['get', 'route_label']], '403'],
						['==', ['coalesce', ['get', 'route_label']], '472'],
						['==', ['coalesce', ['get', 'route_label']], '76'],
						['==', ['coalesce', ['get', 'route_label']], '150']
					]
				]
			]);
		}

		return result;
	}

	function removeWeekendStops(inputarray: any[]) {
		//if it is currently a weekend in california

		let result = inputarray;

		let dayinla = new Date(
			new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
		).getDay();

		if (dayinla == 6 || dayinla == 0) {
			result.push(['!=', ['get', 'onestop_feed_id'], 'f-anteaterexpress']);
		}

		return result;
	}

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
	}

	if (browser) {
		if (
			localStorage.theme === 'dark' ||
			(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
		) {
			document.documentElement.classList.add('dark');
			darkMode = true;
		} else {
			console.log('light mode triggered');
			document.documentElement.classList.remove('dark');
			darkMode = false;
		}
	}

	let maplat: number, maplng: number, mapzoom: number;
	let route_info_lookup: any = {};
	// trip data, indexed via static_feed_id then trip_id
	let trips_per_agency: any = {};
	let layersettingsBox = false;

	const lockonconst = 14.5;

	let mapglobal: any;
	let firstmove = false;
	let secondrequestlockgps = false;

	//	let binaryDataOfGtfsRt: any = new Object();

	let lockongps = false;
	maplng = 0;
	maplat = 0;
	mapzoom = 0;

	let rerenders_requested: string[] = [];

	let showzombiebuses = false;

	// Save the JSON object to local storage
	//localStorage.setItem("myJsonObject", JSON.stringify(jsonObject));

	let layersettings = {
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
		//freeze settings
		rail: {
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
		if (localStorage.getItem(layersettingsnamestorage)) {
			let cachedJsonObject = JSON.parse(localStorage.getItem(layersettingsnamestorage));

			if (cachedJsonObject != null) {
				layersettings = cachedJsonObject;
			}
		}
	}

	const interleave = (arr: any, thing: any) =>
		[].concat(...arr.map((n: any) => [n, thing])).slice(0, -1);

	function rerenders_request(realtime_id: string) {
		//step 1, get the list of routes if it doesnt exist

		// console.log('processing', realtime_id)

		let this_realtime_feed = realtime_feeds_in_frame[realtime_id];

		console.log('feed', realtime_id, realtime_feeds_in_frame[realtime_id])

		// console.log('139',this_realtime_feed)

		if (this_realtime_feed) {
			// console.log('this_realtime_feed',this_realtime_feed)

			let operators_for_this_realtime = this_realtime_feed.operators;

			let operators_to_render = operators_for_this_realtime
				.map((x: any) => operators_in_frame[x])
				.filter((x: any) => x != undefined);

			//console.log('operators for rerender', operators_to_render);
			let big_table: any = {};
			let trips_possible_agencies: any = {};

			let static_feed_ids: string[] = [];

			Object.values(operators_to_render).forEach((operator: any) => {
				//attempt to pull the routes for this operator
				if (operator.gtfs_static_feeds) {
					operator.gtfs_static_feeds.forEach((static_feed_id: string) => {
						static_feed_ids.push(static_feed_id);
						static_feed_ids = [...new Set(static_feed_ids)];
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
					});
				}
			});

			if (Object.keys(big_table).length > 0) {
				let mergetable = Object.assign({}, ...Object.values(big_table));

				let mergetabletrips = Object.assign({}, ...Object.values(trips_possible_agencies));

				// console.log('vehicle data', vehiclesData[realtime_id])

				//render each vehicle vehiclesData[realtime_id].entity

				//console.log('mergetable', mergetable)

				let features = vehiclesData[realtime_id].entity
					.filter((entity: any) => entity.vehicle.timestamp > Date.now() / 1000 - 300 || realtime_id === "f-amtrak~rt")
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

						if (!routeId) {
							//console.log('no route id', realtime_id, entity)
						}

						let fetchTrip = false;

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
								let trimmedRouteId = routeId.replace('-13168', '');
							}
						} else {
							//console.log('no route id', entity)
							if (realtime_id === 'f-metro~losangeles~bus~rt') {
								colour = '#e16710';
							}

							fetchTrip = true;
						}

						if (['f-mta~nyc~rt~mnr','f-metrolink~rt','f-mta~nyc~rt~lirr','f-amtrak~rt'].includes(realtime_id)) {
							routeType = 2;
						}

						if (realtime_id === "f-amtrak~rt") {
							colour = '#18567d';
							console.log('found amtrak')
						}

						if (routeType === 2) {
							//get trip id for intercity rail
							fetchTrip = true;
						}

						//fetchTrip = true;

						//this system sucks, honestly. Transition to batch trips info eventually
						if (fetchTrip === true) {
							//submit a tripsId requests

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
											//console.log('no trip info', vehicle?.trip?.tripId)
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
										if (vehicle.trip.tripId && static_feed_id_to_use != "f-9-amtrak~amtrakcalifornia~amtrakcharteredvehicle") {
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
							maptag = maptag.replace('-13168', '').replace('901', 'G');
						}

						if (realtime_id === 'f-ucla~bruinbus~rt') {
							if (mergetable[routeId]) {
								maptag = mergetable[routeId].long_name;
							} else {
								maptag = 'Bruin-No Route';
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

							console.log('lirr temp', temp1);

							tripIdLabel = temp1[temp1.length - 1];
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
						}

						maptag = maptag.replace(/( )?Line/, '');

						maptag = maptag.replace(/counterclockwise/i, '-ACW').replace(/clockwise/i, '-CW');

						//let tripIdLabel = vehicle?.trip?.tripId;

						let vehiclelabel = vehicle?.vehicle?.label || vehicle?.vehicle?.id || '';

						if (realtime_id === 'f-mta~nyc~rt~bustime') {
							vehiclelabel = vehiclelabel.replace(/mta( )?/i, '');
						}

						if (vehiclelabel == "Pacific Surfliner") {
							vehiclelabel = "Surfliner"
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
				const getrailsource = mapglobal.getSource('rail');

				geometryObj[realtime_id] = features;

				let flattenedarray = flatten(Object.values(geometryObj));

				if (typeof getbussource != 'undefined') {
					getbussource.setData({
						type: 'FeatureCollection',
						features: flattenedarray.filter((x: any) => x.properties.routeType === 3)
					});

					if (typeof getrailsource != 'undefined') {
						getrailsource.setData({
							type: 'FeatureCollection',
							features: flattenedarray.filter((x: any) => x.properties.routeType != 3)
						});
					}

					//console.log('set data of bearings');

					let mapzoomnumber = numberForBearingLengthBus(mapglobal.getZoom());

					// Query all rendered features from a single layer
					//renderNewBearings();
				}
			}
		}
	}

	function runSettingsAdapt() {
		// console.log('run settings adapt', layersettings);

		if (mapglobal) {
			let busshapes = mapglobal.getLayer('busshapes');
			let buslabelshapes = mapglobal.getLayer('labelbusshapes');

			if (foamermode) {
				mapglobal.setLayoutProperty('foamershapes', 'visibility', 'visible');
			} else {
				mapglobal.setLayoutProperty('foamershapes', 'visibility', 'none');
			}

			if (busshapes) {
				if (layersettings.bus.shapes) {
					mapglobal.setLayoutProperty('busshapes', 'visibility', 'visible');
				} else {
					mapglobal.setLayoutProperty('busshapes', 'visibility', 'none');
				}
			}

			if (buslabelshapes) {
				if (layersettings.bus.labelshapes) {
					mapglobal.setLayoutProperty('labelbusshapes', 'visibility', 'visible');
				} else {
					mapglobal.setLayoutProperty('labelbusshapes', 'visibility', 'none');
				}
			}

			let railshapes = mapglobal.getLayer('railshapes');
			let raillabelshapes = mapglobal.getLayer('labelrailshapes');

			if (railshapes) {
				if (layersettings.rail.shapes) {
					mapglobal.setLayoutProperty('railshapes', 'visibility', 'visible');
				} else {
					mapglobal.setLayoutProperty('railshapes', 'visibility', 'none');
				}
			}

			if (raillabelshapes) {
				if (layersettings.rail.labelshapes) {
					mapglobal.setLayoutProperty('labelrailshapes', 'visibility', 'visible');
				} else {
					mapglobal.setLayoutProperty('labelrailshapes', 'visibility', 'none');
				}
			}

			let busstopscircle = mapglobal.getLayer('busstopscircle');
			let buslabelstops = mapglobal.getLayer('busstopslabel');

			if (busstopscircle && buslabelstops) {
				if (layersettings.bus.stops) {
					mapglobal.setLayoutProperty('busstopscircle', 'visibility', 'visible');
				} else {
					mapglobal.setLayoutProperty('busstopscircle', 'visibility', 'none');
				}

				if (layersettings.bus.stoplabels) {
					mapglobal.setLayoutProperty('busstopslabel', 'visibility', 'visible');
				} else {
					mapglobal.setLayoutProperty('busstopslabel', 'visibility', 'none');
				}
			}

			let buscirclelayer = mapglobal.getLayer('buses');
			let buslabel = mapglobal.getLayer('labelbuses');

			if (buscirclelayer && buslabel) {
				if (layersettings.bus.visible) {
					mapglobal.setLayoutProperty('buses', 'visibility', 'visible');
					mapglobal.setLayoutProperty('labelbuses', 'visibility', 'visible');
					mapglobal.setLayoutProperty(
						'labelbuses',
						'text-field',
						interpretLabelsToCode(layersettings.bus.label, usunits)
					);
					['busespointingshell',"busespointing"].forEach((x) => {
					mapglobal.setLayoutProperty(x, 'visibility', 'visible');
					})
				} else {
					mapglobal.setLayoutProperty('buses', 'visibility', 'none');
					mapglobal.setLayoutProperty('labelbuses', 'visibility', 'none');
					['busespointingshell',"busespointing"].forEach((x) => {
					mapglobal.setLayoutProperty(x, 'visibility', 'none');
					})
				}
			}

			let railcirclelayer = mapglobal.getLayer('raillayer');
			let raillabel = mapglobal.getLayer('labelrail');

			if (railcirclelayer && raillabel) {
				if (layersettings.rail.visible) {
					mapglobal.setLayoutProperty('raillayer', 'visibility', 'visible');
					mapglobal.setLayoutProperty('labelrail', 'visibility', 'visible');
					mapglobal.setLayoutProperty(
						'labelrail',
						'text-field',
						interpretLabelsToCode(layersettings.rail.label, usunits)
					);
					['railpointingshell',"railpointing"].forEach((x) => {
					mapglobal.setLayoutProperty(x, 'visibility', 'visible');
					})
				} else {
					mapglobal.setLayoutProperty('raillayer', 'visibility', 'none');
					mapglobal.setLayoutProperty('labelrail', 'visibility', 'none');
					['railpointingshell',"railpointing"].forEach((x) => {
					mapglobal.setLayoutProperty(x, 'visibility', 'none');
					})
				}
			}
		}

		localStorage.setItem(layersettingsnamestorage, JSON.stringify(layersettings));

		let railvehicles = mapglobal.getLayer('raillayer');

		let busvehicles = mapglobal.getLayer('buses');

		let hidevehiclecommand = ['!=', '', ['get', 'tripIdLabel']];

		let regularpointers = ["!=", 0, ['get', 'bearing']];
		let hidevehiclecommandpointers = ['all', ['!=', '', ['get', 'tripIdLabel']], ["!=", 0, ['get', 'bearing']]];

		if (busvehicles) {
			if (showzombiebuses === true) {
				//set filter to none
				mapglobal.setFilter('buses', undefined);
				mapglobal.setFilter('labelbuses', undefined);
				mapglobal.setFilter('busespointing', regularpointers);
				mapglobal.setFilter('busespointingshell', regularpointers)
			} else {
				console.log('hiding buses');
				mapglobal.setFilter('buses', hidevehiclecommand);
				mapglobal.setFilter('labelbuses', hidevehiclecommand);
				mapglobal.setFilter('busespointing', hidevehiclecommandpointers);
				mapglobal.setFilter('busespointingshell', hidevehiclecommandpointers);
			}
		} else {
			console.error('no bus vehicles layer');
		}
		if (railvehicles) {
			if (showzombiebuses === true) {
				//set filter to none
				mapglobal.setFilter('raillayer', undefined);
				mapglobal.setFilter('labelrail', undefined);
				mapglobal.setFilter('railpointing', regularpointers);
				mapglobal.setFilter('railpointingshell', regularpointers);
			} else {
				mapglobal.setFilter('raillayer', hidevehiclecommand);
				mapglobal.setFilter('labelrail', hidevehiclecommand);
				mapglobal.setFilter('railpointing', hidevehiclecommandpointers);
				mapglobal.setFilter('railpointingshell', hidevehiclecommandpointers);
			}
		}

		true;
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
			? 'mapbox://styles/kylerschin/clm2i6cmg00fw01of2vp5h9p5'
			: 'mapbox://styles/kylerschin/cllpbma0e002h01r6afyzcmd8';

		if (browser) {
			if (window.location.search.includes('sat')) {
				style = 'mapbox://styles/kylerschin/clncqfm5p00b601recvp14ipu';
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
			accessToken: !window.location.search.includes('sat')
				? decode(
						'ꉰ騮罹縱𒁪险ꌳ轳罘蹺鴲靰繩繳穭葩罩陪筪陳繪輰艈艷繄艺筮陷荘靨ꍄ荲鵄繫敮謮轤𔕰𖥊浊豧扁缭𠁎詫鐵ᕑ'
				  )
				: decode(
						decode(
							'𠿪𦾰𣒨𤏧𦶹𣞸𡣰𣂁𡿩𦺩𣢬𢏩𦺵𣎭𡻩𦲰𠶙𡿩𧂬𣎍𣿧𧚨𡮔𦺩𢾹𣿧𦶓𣲸𡏨𦺭𣦽𡿦𦺇𣖹𡣰𣒅𡏨𦶸𠪙𡻩𦺲𡪙𢏩𧚺𠺓𦺲𣆹𢿨𦺘𣢼𢟩𦾗𣞜𢻨𦾳𢾭𡏦𧚑𢞖𦾐𡖑𣟩𧚘𠞒𦲍𣞠𡏪𦲫𡂡𡿨𦲭𣶙𡳰𡞡𡿨ᖬ'
						)
				  ),
			center: centerinit, // starting position [lng, lat]
			//keep the centre at Los Angeles, since that is our primary user base currently
			//switch to IP geolocation and on the fly rendering for this soon
			zoom: zoominit, // starting zoom (must be greater than 8.1)
			fadeDuration: 0
		});

		mapglobal = map;

		//updates the debug window with the current map lng and lat
		function updateData() {
			mapzoom = map.getZoom();
			maplng = map.getCenter().lng;
			maplat = map.getCenter().lat;

			current_map_heading = map.getBearing();
		}

		function renderNewBearings() {
			if (true) {
				//console.log('render new bearings');
				//let start = performance.now();

				const features = map.queryRenderedFeatures({ layers: ['buses'] });

				let mapzoomnumber = numberForBearingLengthBus(map.getZoom());

				let busstart = performance.now();
				let newbearingdata = {
					type: 'FeatureCollection',
					features: features
						.filter((x: any) => x.properties.bearing != undefined)
						.filter((x: any) => x.properties.bearing != 0)
						.map((x: any) => {
							let newcoords = calculateNewCoordinates(
								x.geometry.coordinates[1],
								x.geometry.coordinates[0],
								x.properties.bearing,
								mapzoomnumber / 1000
							);

							return {
								type: 'Feature',
								geometry: {
									type: 'LineString',
									coordinates: [
										[x.geometry.coordinates[0], x.geometry.coordinates[1]],
										[newcoords.longitude, newcoords.latitude]
									]
								},
								properties: {
									bearing: x.properties.bearing,
									color: x.properties.color,
									cd: x.properties.contrastdarkmodebearing
								}
							};
						})
				};

				//console.log('computed bus bearings in', performance.now() - busstart, 'ms');

				//console.log("took ", performance.now() - start, "ms")

				//console.log('newbearingdata', newbearingdata)

				let busbearings = map.getSource('busbearings');

				//ensure the layer exists
				if (busbearings) {
					//busbearings.setData(newbearingdata);
				}

				const railfeatures = map.queryRenderedFeatures({ layers: ['raillayer'] });

				let railmapzoomnumber = numberForBearingLengthRail(map.getZoom());

				let railstart = performance.now();
				let newrailbearingdata = {
					type: 'FeatureCollection',
					features: railfeatures
						.filter((x: any) => x.properties.bearing != undefined)
						.filter((x: any) => x.properties.bearing != 0)
						.map((x: any) => {
							let newcoords = calculateNewCoordinates(
								x.geometry.coordinates[1],
								x.geometry.coordinates[0],
								x.properties.bearing,
								railmapzoomnumber / 1000
							);

							return {
								type: 'Feature',
								geometry: {
									type: 'LineString',
									coordinates: [
										[x.geometry.coordinates[0], x.geometry.coordinates[1]],
										[newcoords.longitude, newcoords.latitude]
									]
								},
								properties: {
									//bearing: x.properties.bearing,
									color: x.properties.color,
									cd: x.properties.contrastdarkmodebearing
								}
							};
						})
				};

				//console.log('computed rail bearings in', performance.now() - railstart, 'ms');

				//console.log('newbearingdata', newbearingdata)

				let railbearings = map.getSource('railbearings');

				if (railbearings) {
					railbearings.setData(newrailbearingdata);
				}

				var end = performance.now();

				//console.log('bearing calc took', end - start);
			}
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

		map.on('load', () => {
			const urlParams = new URLSearchParams(window.location.search);
			// Add new sources and layers
			let removelogo1 = document.getElementsByClassName('mapboxgl-ctrl-logo');

			 if (removelogo1) {
			 	removelogo1[0].remove();
			 }

			addGeoRadius(map);
			if (urlParams.get('debug')) {
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

			/*
			map.addLayer({
				id: 'static_feed_calc',
				type: 'fill',
				source: 'static_feeds',
				paint: {
					'fill-color': '#0055aa',
					'fill-opacity': 0
				}
			});*/

			map.addSource('static_feeds_hull', {
				type: 'vector',
				url: `${what_martin_to_use()}/static_feeds`
			});

			map.addLayer({
				id: 'static_hull_calc',
				type: 'fill',
				source: 'static_feeds_hull',
				'source-layer': 'static_feeds',
				//filter: ["==", ['get', 'onestop_feed_id'], 'f-anteaterexpress'],
				paint: {
					'fill-color': '#0055aa',
					'fill-opacity': 0
				}
			});



			if (urlParams.get('debug')) {
				//map.showTileBoundaries = true;

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
				id: 'busshapes',
				type: 'line',
				source: 'busshapes',
				'source-layer': 'busonly',
				filter: removeWeekends(
					processUrlLimit([
						'all',
						['!=', ['get', 'onestop_feed_id'], 'f-9-flixbus'],
						[
							'!',
							[
								'all',
								['==', 'f-9mu-mts', ['get', 'onestop_feed_id']],
								['==', ['coalesce', ['get', 'route_label']], '950']
							]
						],
						[
							'!',
							[
								'all',
								['==', 'f-9mu-mts', ['get', 'onestop_feed_id']],
								['==', ['coalesce', ['get', 'route_label']], 'Old Town to Airport Shuttle']
							]
						],
					//	['!=', ['get', 'onestop_feed_id'], 'f-9-flixbus'],
					//	['!=', ['get', 'onestop_feed_id'], 'f-u-flixbus']
					])
				),
				paint: {
					'line-color': ['concat', '#', ['get', 'color']],
					'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 14, 2.6],
					//'line-opacity': ['step', ['zoom'], 0.7, 7, 0.8, 8, 0.9]
					'line-opacity': 0.4
					// 'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.2, 10, 0.4]
				},
				minzoom: 8
			});

			// the layer must be of type 'line'

			map.addLayer({
				id: 'labelbusshapes',
				type: 'symbol',
				source: 'busshapes',
				'source-layer': 'busonly',
				filter: removeWeekends(
					processUrlLimit([
						'all',
						[
							'!',
							[
								'all',
								['==', 'f-9mu-mts', ['get', 'onestop_feed_id']],
								['==', ['coalesce', ['get', 'route_label']], '950']
							]
						],
						[
							'!',
							[
								'all',
								['==', 'f-9mu-mts', ['get', 'onestop_feed_id']],
								['==', ['coalesce', ['get', 'route_label']], 'Old Town to Airport Shuttle']
							]
						],
						['!=', ['get', 'onestop_feed_id'], 'f-9-flixbus'],
						//['!=', ['get', 'onestop_feed_id'], 'f-u-flixbus']
					])
				),
				layout: {
					'symbol-placement': 'line',
					//'text-field': ['coalesce', ['get', 'route_label']],
					'text-field': urlParams.get('debug') ? 
					['concat', ['get','onestop_feed_id'],"|",['get','shape_id'],"|",['coalesce', ['get', 'route_label']]] : ['coalesce', ['get', 'route_label']],
					//'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
					'text-font': ['literal', ['Open Sans Regular', 'Arial Unicode MS Regular']],
					'text-size': ['interpolate', ['linear'], ['zoom'], 8, 6, 9, 7, 13, 11],
					'text-ignore-placement': false,
					'text-allow-overlap': false,
					'symbol-spacing':
						window?.innerWidth > 750
							? ['step', ['zoom'], 200, 12, 120, 13, 130, 15, 130, 20, 200]
							: ['step', ['zoom'], 200, 12, 100, 13, 110, 15, 100, 20, 200],
					visibility: 'none'
				},
				paint: {
					'text-color': ['concat', '#', ['get', 'text_color']],

					'text-halo-color': ['concat', '#', ['get', 'color']],
					'text-halo-width': 3,
					'text-halo-blur': 0,
					'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.8, 10, 1]
				},
				minzoom: 7
			});

			map.addLayer({
				id: 'railshapes',
				type: 'line',
				source: 'notbusshapes',
				'source-layer': 'notbus',
				filter: processUrlLimit(['all', ['!=', 4, ['get', 'route_type']]]),
				paint: {
					'line-color': ['concat', '#', ['get', 'color']],
					'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 9, 3],
					'line-opacity': 1
				},
				minzoom: 3
			});

			map.addLayer({
				id: 'ferryshapes2',
				type: 'line',
				source: 'notbusshapes',
				'source-layer': 'notbus',
				filter: processUrlLimit(['all', ['==', 4, ['get', 'route_type']]]),
				paint: {
					'line-dasharray': [1, 2],
					'line-color': ['concat', '#', ['get', 'color']],
					'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 14, 3],
					'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 7, 0.9]
				},
				minzoom: 3
			});

			/*
			map.addLayer({
				id: 'ferryshapes',
				type: 'line',
				source: 'notbusshapes',
				'source-layer': 'notbus',
				minzoom: 3,
				
				filter: processUrlLimit(['all', ['==', 4, ['get', 'route_type']]]),
				//filter: processUrlLimit(['==', 4, ['get', 'route_type']]),
			'line-dasharray': [2, 1],
				'line-color': "#00ff00",
				//'line-opacity': ['step', ['zoom'], 0.7, 7, 0.8, 8, 0.9]
				'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.2, 10, 0.4]
			});*/

			map.addLayer({
				id: 'labelrailshapes',
				type: 'symbol',
				source: 'notbusshapes',
				'source-layer': 'notbus',
				filter: ['all', ['!=', 3, ['get', 'route_type']], ['!=', 11, ['get', 'route_type']]],
				layout: {
					'symbol-placement': 'line',
					'text-field': ['coalesce', ['get', 'route_label']],
					//'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
					'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
					'text-size': ['interpolate', ['linear'], ['zoom'], 3, 7, 9, 9, 13, 11],
					'text-ignore-placement': false,

					'symbol-spacing': ['step', ['zoom'], 20, 6, 40, 9, 70, 13, 80, 15, 100],
					'text-allow-overlap': false,
					visibility: 'none'
				},
				paint: {
					'text-color': ['concat', '#', ['get', 'text_color']],

					'text-halo-color': ['concat', '#', ['get', 'color']],
					'text-halo-width': 3,
					'text-halo-blur': 1
					//'text-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0, 3.5, 0.8, 4, 1]
				},
				minzoom: 3
			});

			map.addLayer({
				id: 'busstopscircle',
				type: 'circle',
				source: 'busstops',
				'source-layer': 'busstops',
				layout: {},
				paint: {
					'circle-color': '#1c2636',
					'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 0.9, 12, 1.2, 13, 2],
					'circle-stroke-color': darkMode
						? ['step', ['zoom'], '#e0e0e0', 14, '#dddddd']
						: '#333333',
					'circle-stroke-width': ['step', ['zoom'], 1.2, 13.2, 1.5],
					'circle-stroke-opacity': ['step', ['zoom'], 0.5, 15, 0.6],
					'circle-opacity': 0.1
				},
				minzoom: window?.innerWidth >= 1023 ? 12.5 : 11,
				filter: removeWeekendStops(['all',
			
				['!', ['in', 1, ['get', 'route_types']]],
				['!', ['in', 0, ['get', 'route_types']]],
				['!', ['in', 2, ['get', 'route_types']]]])
			});

			map.addLayer({
				id: 'busstopslabel',
				type: 'symbol',
				source: 'busstops',
				'source-layer': 'busstops',
				filter: removeWeekendStops(['all', 
				['!', ['in', 1, ['get', 'route_types']]],
				['!', ['in', 0, ['get', 'route_types']]],
				['!', ['in', 2, ['get', 'route_types']]]
			]),
				layout: {
					'text-field': ['get', 'name'],
					//'text-field': ['coalesce', ['get', 'route_types']],
					'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
					'text-size': ['interpolate', ['linear'], ['zoom'], 12, 6, 15, 8],
					'text-radial-offset': 0.7,
					//'text-ignore-placement': false,
					//'icon-ignore-placement': false,
					//'text-allow-overlap': true,
					//'symbol-avoid-edges': false,
					'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular']
				},
				paint: {
					'text-color': darkMode ? '#ddd6fe' : '#2a2a2a',
					'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
					'text-halo-width': 0.4
				},
				minzoom: 14
			});

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
				}, "railstopscircle");

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
			}, "railstopscircle");
			})

			map.addLayer({
				id: 'railstopscircle',
				type: 'circle',
				source: 'railstops',
				'source-layer': 'railstops',
				layout: {},
				paint: {
					'circle-color': '#1c2636',
					'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 15, 8],
					'circle-stroke-color': darkMode
						? ['step', ['zoom'], '#e0e0e0', 14, '#dddddd']
						: '#333333',
					'circle-stroke-width': ['step', ['zoom'], 1.2, 13.2, 1.5],
					'circle-stroke-opacity': ['step', ['zoom'], 0.5, 15, 0.6],
					'circle-opacity': 0.1
				},
				minzoom: 3,
				filter: removeWeekendStops(['all',
				[
					'all',
					[
						'any',
						['>',['zoom'],15],
						['==', null, ['get', "children_route_types"]]
					],
					['any',
					['in', 2, ['get', 'route_types']],
					['in', 2, ['get', "children_route_types"]]
					]
				],
				])
			});

			map.addLayer({
				id: 'raillabel',
				type: 'symbol',
				source: 'railstops',
				'source-layer': 'railstops',
				layout: {
					'text-field': ['get', 'name'],
					'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
					'text-size': ['interpolate', ['linear'], ['zoom'], 9, 8, 15, 10, 17, 12],
					'text-radial-offset': 1,
					//'text-ignore-placement': true,
					//'icon-ignore-placement': false,
					//'text-allow-overlap': true,
					//'symbol-avoid-edges': false,
					'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
					
				},
				paint: {
					
					'text-color': darkMode ? '#ddd6fe' : '#2a2a2a',
					'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
					'text-halo-width': 1
				},
				filter: [
					'all',
					[
						'any',
						['>',['zoom'],15],
						['==', null, ['get', "children_route_types"]],
						
					],
					['any',
					['in', 2, ['get', 'route_types']],
					['in', 2, ['get', "children_route_types"]]
					]
				],
				minzoom: 3
			});


			/*
			map.addLayer({
				id: 'railstopscircle',
				type: 'circle',
				source: 'stops',
				'source-layer': 'stops',
				layout: {},
				paint: {
					'circle-color': '#1c2636',
					'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 0.9, 12, 1.2, 13, 2],
					'circle-stroke-color': darkMode
						? ['step', ['zoom'], '#e0e0e0', 14, '#dddddd']
						: '#333333',
					'circle-stroke-width': ['step', ['zoom'], 1.2, 13.2, 1.5],
					'circle-stroke-opacity': ['step', ['zoom'], 0.5, 15, 0.6],
					'circle-opacity': 0.1
				},
				minzoom: window?.innerWidth >= 1023 ? 12.5 : 11,
				filter: removeWeekendStops(['all'])
			});

			map.addLayer({
				id: 'railstopslabelclose',
				type: 'symbol',
				source: 'stops',
				'source-layer': 'stops',
				filter: removeWeekendStops(['all']),
				layout: {
					'text-field': ['get', 'name'],
					'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
					'text-size': ['interpolate', ['linear'], ['zoom'], 12, 6, 15, 8],
					'text-radial-offset': 0.7,
					'icon-image': ['get', 'network'],
					'icon-size': 1,
					//'text-ignore-placement': false,
					//'icon-ignore-placement': false,
					//'text-allow-overlap': true,
					//'symbol-avoid-edges': false,
					'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular']
				},
				paint: {
					'text-color': darkMode ? '#ddd6fe' : '#2a2a2a',
					'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
					'text-halo-width': 0.4
				},
				minzoom: window?.innerWidth >= 1023 ? 14 : 12.4
			});

			map.addLayer({
				id: 'railstopslabelfar',
				type: 'symbol',
				source: 'stops',
				'source-layer': 'stops',
				filter: ['all'],
				layout: {
					'text-field': ['get', 'name'],
					'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
					'text-size': ['interpolate', ['linear'], ['zoom'], 12, 8, 15, 9],
					'text-radial-offset': 0.7,
					'icon-image': ['get', 'network'],
					'icon-size': 1,
					//'text-ignore-placement': false,
					//'icon-ignore-placement': false,
					//'text-allow-overlap': true,
					//'symbol-avoid-edges': false,
					'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular']
				},
				paint: {
					'text-color': darkMode ? '#ddd6fe' : '#2a2a2a',
					'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
					'text-halo-width': 0.4
				},
				minzoom: window?.innerWidth >= 1023 ? 14 : 12.4
			});*/

			map.addSource('buses', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addSource('busbearings', {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'LineString',
						coordinates: []
					}
				}
			});

			/*
			map.addLayer({
				id: 'busbearingslayer',
				type: 'line',
				source: 'busbearings',
				layout: {
					//'line-join': 'round',
					//'line-cap': 'round'
				},
				paint: {
					'line-color': ['get', darkMode === true ? 'cd' : 'color'],
					'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3, 10, 1.8, 12, 2.5, 13, 3],
					'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.9]
				},
				minzoom: 7
			});*/

			map.addSource('railbearings', {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'LineString',
						coordinates: []
					}
				}
			});

			/*
			map.addLayer({
				id: 'railbearingslayer',
				type: 'line',
				source: 'railbearings',
				layout: {
					//'line-join': 'round',
					//'line-cap': 'round'
				},
				paint: {
					'line-color': ['get', 'color'],
					'line-width': ['interpolate', ['linear'], ['zoom'], 9, 4, 10, 3.5, 13, 4],
					'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.9]
				}
			});*/

			makeBearingArrowPointers(map, darkMode);

			makeCircleLayers(map, darkMode);

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

										rtFeedsTimestampsVehicles[realtime_id] = feed.header.timestamp;

										vehiclesData[realtime_id] = feed;

										console.log('request render', realtime_id)
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
							console.log('delete gtfsrt', vehiclesDataCheckCleanUp);
							delete vehiclesData[vehiclesDataCheckCleanUp];
						}
					});
				}
			}, 500);

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
					'fill-opacity': 0.2
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

			map.loadImage('https://maps.catenarymaps.org/geo-nav.png', (error, image) => {
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

			setInterval(() => {
				let bottomright = document.getElementsByClassName('mapboxgl-ctrl-bottom-right');

				if (bottomright) {
					if (bottomright[0] != undefined) {
						bottomright[0].remove();
					}
				}

				//console.log('requested rerender of ', rerenders_requested)

				if (rerenders_requested.length > 0) {
					rerenders_requested.forEach((x) => {
						rerenders_request(x);
					});
					rerenders_requested = [];
				}
			}, 2000);
		});

		map.on('move', () => {
			updateData();
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
			if (lasttimezoomran < Date.now() - 1000) {
				lasttimezoomran = Date.now();

				//renderNewBearings();
				
			runSettingsAdapt();
			}
		});

		map.on('mouseenter', 'buses', () => (map.getCanvas().style.cursor = 'pointer'));
		map.on('mouseleave', 'buses', () => (map.getCanvas().style.cursor = ''));
		map.on('mouseenter', 'raillayer', () => (map.getCanvas().style.cursor = 'pointer'));
		map.on('mouseleave', 'raillayer', () => (map.getCanvas().style.cursor = ''));

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
							let numberofpoints: number = 64;

							let geojsondata = createGeoJSONCircle(
								[location.coords.longitude, location.coords.latitude],
								location.coords.accuracy / 1000,
								numberofpoints
							);

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

	let settingsBox: boolean = false;

	function togglelayerfeature() {
		settingsBox = false;
		layersettingsBox = !layersettingsBox;
	}

	if (typeof window === 'object') {
		document.getElementsByTagName('body')[0].classList.add('overflow-none');
	}

	function togglesettingfeature() {
		settingsBox = !settingsBox;

		layersettingsBox = false;
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

<div id="map" style="width: 100svw; height: 100svh;" />


<div class="fixed bottom-0 right-0 pointer-events-none bg-zinc-900 bg-opacity-70 text-gray-50 pointer-events-auto select-none clickable"

>
	View: {maplat.toFixed(5)}, {maplng.toFixed(5)} Z: {mapzoom.toFixed(2)} | 
	{#if typeof geolocation === 'object'}
		You: {geolocation.coords.latitude.toFixed(5)}, 
		{geolocation.coords.longitude.toFixed(5)}
		{#if typeof geolocation.coords.altitude === 'number'}
		{geolocation.coords.altitude.toFixed(0)} m
		{/if}
		{#if typeof geolocation.coords.speed === 'number'}
				{#if usunits == false}
					| {geolocation.coords.speed.toFixed(2)} m/s ({(3.6 * geolocation.coords.speed).toFixed(2)} km/h)
				{:else}
					| {(2.23694 * geolocation.coords.speed).toFixed(2)} mph
				{/if}
		{/if}
	{/if}
</div>


{#if typeof window !== 'undefined'}
	{#if window.localStorage.alertPopupShown != 'hide'}
		<Alertpopup imageURL={"/img/special/holiday.png"}>
			<h1 class="text-lg">{strings.appwidealert}</h1>
			<p class="text-sm">{strings.appwidesubtext}</p>
		</Alertpopup>
	{/if}
{/if}


<!-- {#if (realtime_list.includes('f-mts~rt~onebusaway') || realtime_list.includes('f-northcountrytransitdistrict~rt')) && mapzoom > 10 && alertPopupShown}
	<div
		class="fixed top-3 left-3 pointer-events-none dark:bg-gray-900 dark:text-gray-50 pointer-events-auto clickable"
		style:padding="15px"
		style:border-radius="10px"
		style:max-width="20vw"
		style:color="white"
		style:background="url(https://www.ridepronto.com/media/yyoa3ggh/repeating-bg-pronto.jpg?format=webp&quality=80)"
	>
		<div
			on:click={() => (alertPopupShown = false)}
			style:cursor="pointer !important"
			class="border border-gray-500 bg-gray-700 rounded-full h-8 w-8 absolute right-2 top-2 flex justify-center items-center"
		>
			<span class="material-symbols-outlined margin-auto select-none"> close </span>
		</div>
		<img
			src="https://www.ridepronto.com/media/k5gp4agw/tap-or-scan-home-v2-icon.png?format=webp&quality=80&height=100"
			style=""
			style:height="70px"
			alt=""
		/>
		<h1 style:font-size="1.3em">{strings.alertheadersd}</h1>
		<p>{strings.alertsubtextsd}</p>
		<a href="https://ridepronto.com" style:cursor="pointer" class="text-yellow-200"
			>{strings.learnmore} &rarr;</a
		>
		<br />
	</div>
{/if} -->

<!-- {#if realtime_list.includes('f-metro~losangeles~rail~rt') && mapzoom > 10 && alertPopupShown}
	<div
		class="fixed top-3 left-3 pointer-events-none dark:bg-gray-900 dark:text-gray-50 pointer-events-auto clickable"
		style:padding="15px"
		style:border-radius="10px"
		style:max-width="20vw"
		style:color="white"
		style:background="linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(https://art.metro.net/wp-content/uploads/2021/08/Mark-Steven-Greenfield-Red-Car-Requiem-B.jpeg) center right no-repeat, black"
		style:background-size="cover"
	>
		<div
			on:click={() => (alertPopupShown = false)}
			style:cursor="pointer !important"
			class="border border-gray-500 bg-gray-700 rounded-full h-8 w-8 absolute right-2 top-2 flex justify-center items-center"
		>
			<span class="material-symbols-outlined margin-auto select-none"> close </span>
		</div>
		<img
			src="/img/special/stationart.svg"
			style=""
			style:height="70px"
			alt=""
		/>
		<h1 style:font-size="1.3em">{strings.alertheaderla}</h1>
		<p>{strings.alertsubtextla}</p>
		<a href="https://taptogo.net" style:cursor="pointer" class="text-yellow-200"
			>{strings.learnmore} &rarr;</a
		>
		<br />
	</div>
{/if} -->

<div class="fixed top-4 right-4 flex flex-col gap-y-2 pointer-events-none">
	<div
		on:click={togglesettingfeature}
		on:keypress={togglesettingfeature}
		class="!cursor-pointer bg-white select-none z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
	>
		<span class="!cursor-pointer material-symbols-outlined align-middle select-none">
			settings
		</span>
	</div>

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
	class="fixed bottom-0 w-full rounded-t-lg sm:w-fit sm:bottom-4 sm:right-4 bg-yellow-50 dark:bg-gray-900 dark:text-gray-50 bg-opacity-90 sm:rounded-lg z-50 px-3 py-2 text-right {settingsBox
		? ''
		: 'hidden'}"
>
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
		<input
			on:click={(x) => {
				showzombiebuses = !showzombiebuses;

				runSettingsAdapt();
			}}
			on:keydown={(x) => {
				showzombiebuses = !showzombiebuses;

				runSettingsAdapt();
			}}
			checked={showzombiebuses}
			id="show-zombie-buses"
			type="checkbox"
			class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
		/>
		<label for="show-zombie-buses" class="ml-2">{strings.showtripless}</label>
	</div>

	<div>
		<select
			id="languageSelect"
			name="languageSelect"
			style="color: black;"
			on:change={() => {
				// @ts-expect-error
				let language = document.querySelector('#languageSelect').value;
				document.querySelector('html')?.setAttribute('lang', language);
				// @ts-expect-error
				strings = i18n[language];
				window.localStorage.setItem('language', language);
			}}
		>
			<option value="en">English</option>
			<option value="fr">Français</option>
			<option value="es">Español</option>
			<option value="ko">한국어</option>
		</select>
		<label for="languageSelect" class="ml-2">{strings.language}</label>
	</div>

	<a
		href="#"
        on:click={() => {
            window.localStorage.alertPopupShown = null;
            window.location.reload()
        }}
    >
        Click to reset popup consent
    </a>

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
</div>

<div
	class="fixed bottom-0 w-full rounded-t-lg sm:w-fit sm:bottom-4 sm:right-4 bg-yellow-50 dark:bg-gray-900 dark:text-gray-50 bg-opacity-90 dark:bg-opacity-90 sm:rounded-lg z-50 px-3 py-2 {layersettingsBox
		? ''
		: 'hidden'}"
>
	<div class="rounded-xl mx-0 my-2 flex flex-row w-full text-black dark:text-white">
		

		

		<Layerselectionbox text={strings.headingLocalRail}
		changesetting={() => {
			selectedSettingsTab = 'localrail';
		}}
		cssclass={`${
			selectedSettingsTab === 'localrail' ? enabledlayerstyle : disabledlayerstyle
		} w-1/2 py-1 px-1`}
		/>

		<Layerselectionbox text={strings.headingIntercityRail}
		changesetting={() => {
			selectedSettingsTab = 'intercityrail';
		}}
		cssclass={`${
			selectedSettingsTab === 'intercityrail' ? enabledlayerstyle : disabledlayerstyle
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
		<!-- <div
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
		</div> -->
	</div>

	{#if selectedSettingsTab === 'more'}
		<div class="flex flex-row gap-x-1">
			
		</div>
	{/if}

	{#if ["other", "bus", 'intercityrail', 'localrail', 'rail'].includes(selectedSettingsTab)}
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
				selectedSettingsTab="bus"
				change="stops"
				name={strings.stops}
				urlicon="/stopsicon.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				selectedSettingsTab="bus"
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

	<!--
	<p class="text-xs">
		Current Units: {#if usunits === false}metric{:else}US{/if}. Switch in settings.
	</p>
	-->
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
	}

	#map {
		width: 100%;
		height: 100%;
	}

	.runSidebar {
		border-left: none !important;
		border-top-right-radius: var(--radius);
		border-bottom-right-radius: var(--radius);
		box-shadow: 0 0 var(--glow) var(--primary);
		background-color: var(--background);
		color: #fff;
		padding: 6px 12px;
		font-family: 'Open Sans', sans-serif;
		z-index: 1;
		position: absolute;
		left: 0;
		bottom: 40px;
		font-size: 14px;
		padding: 10px;
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
