<script lang="ts">
	import { calculateNewCoordinates, createGeoJSONCircle, componentToHex } from '../../geoMathsAssist';
	//switch to maplibre-gl soon, protomaps in the works
	import mapboxgl, { type MapboxGeoJSONFeature } from 'mapbox-gl';
	import { onMount } from 'svelte';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
	import { construct_svelte_component, run } from 'svelte/internal';
	import { hexToRgb, rgbToHsl, hslToRgb } from '../../utils/colour';
	import { browser } from '$app/environment';
	import { decode as decodeToAry, encode as encodeAry } from 'base65536';
	import { LngLat } from 'maplibre-gl';
	import { flatten } from '../../utils/flatten';
	import { determineFeeds } from '../../maploaddata';
	import Layerbutton from '../../layerbutton.svelte';
	import Realtimelabel from '../../realtimelabel.svelte';

	let enabledlayerstyle = 'text-black dark:text-white bg-blue-200 dark:bg-gray-700 border border-blue-800 dark:border-blue-200'
	let disabledlayerstyle = 'text-gray-900 dark:text-gray-50 border bg-gray-300 border-gray-300 dark:bg-gray-800  dark:border-gray-800'

	let darkMode = true;
	//false means use metric, true means use us units
	let selectedSettingsTab = 'rail'; //valid options {rail, bus, bike}
	let usunits = false;
	let realtime_list: string[] = [];
	let vehiclesData: any = {};
	//stores geojson data for currently rendered GeoJSON realtime vehicles data, indexed by realtime feed id
	let geometryObj: any = {};
	let lasttimeofnorth = 0;

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

	function processUrlLimit(inputarray:any) {
		const urlParams = new URLSearchParams(window.location.search);

		if (urlParams.get("limitfeed")) {
			inputarray.push(["==", ["get", "onestop_feed_id"], urlParams.get("limitfeed")])
		
			return inputarray
		} else {
			return inputarray;
		}
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

	function textColorOfMapLabels() {
		return ['get', darkMode === true ? 'contrastdarkmode' : 'color'];
	}

	if (browser) {
		if (localStorage.getItem('units') === 'us') {
			usunits = true;
		} else {
			usunits = false;
		}
	}

	function handleSwitchDarkMode() {
		darkMode = !darkMode;

		localStorage.setItem('theme', darkMode ? 'dark' : 'light');

		darkMode
			? document.documentElement.classList.add('dark')
			: document.documentElement.classList.remove('dark');
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

	let showzombiebuses=false;

	// Save the JSON object to local storage
//localStorage.setItem("myJsonObject", JSON.stringify(jsonObject));

let layersettings =  {
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
				speed: false,
			}
		},
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
				speed: false,
			},
		},
	};

// Get the JSON object from local storage

const layersettingsnamestorage= "layersettingsv2"

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

	function interpretLabelsToCode(label: any) {
		let arrayofinfo = [];

		if (label.route) {
			arrayofinfo.push(['get', 'maptag']);
		}

		if (label.trip) {
			arrayofinfo.push(['get', 'tripIdLabel']);
		}

		if (label.vehicle) {
			arrayofinfo.push(['get', 'vehicleIdLabel']);
		}

		if (label.headsign) {
			arrayofinfo.push(['get', 'headsign']);
		}

		if (label.speed) {
			//round to 0.1 place
			if (usunits === false) {
				arrayofinfo.push(['/', ['round', ['*', ['get', 'speed'], 36]], 10]);
			} else {
				arrayofinfo.push(['/', ['round', ['*', ['get', 'speed'], 22.3694]], 10]);
			}
		}

		return ['concat', ...interleave(arrayofinfo, '|')];
	}

	function rerenders_request(realtime_id: string) {
		//step 1, get the list of routes if it doesnt exist

		// console.log('processing', realtime_id)

		let this_realtime_feed = realtime_feeds_in_frame[realtime_id];

		// console.log('139',this_realtime_feed)

		if (this_realtime_feed) {
			// console.log('this_realtime_feed',this_realtime_feed)

			let operators_for_this_realtime = this_realtime_feed.operators;

			let operators_to_render = operators_for_this_realtime
				.map((x: any) => operators_in_frame[x])
				.filter((x: any) => x != undefined);

			//console.log('operators for rerender', operators_to_render);
			let big_table: any = {};

			let static_feed_ids: string[] = [];

			Object.values(operators_to_render).forEach((operator: any) => {
				//attempt to pull the routes for this operator
				if (operator.gtfs_static_feeds) {
					operator.gtfs_static_feeds.forEach((static_feed_id: string) => {
						static_feed_ids.push(static_feed_id);
						static_feed_ids = [...new Set(static_feed_ids)];
						//this static feed

						if (route_info_lookup[static_feed_id] == undefined) {
							fetch(
								'https://backend.catenarymaps.org/getroutesperagency?feed_id=' + static_feed_id
							)
								.then((x) => x.json())
								.then((x) => {
									route_info_lookup[static_feed_id] = convertArrayToObject(x, 'route_id');
									rerenders_request(realtime_id);
									// console.log('saved results for this agency', static_feed_id)
								})
								.catch((e) => {
									console.error(e);
								});
						} else {
							//console.log('already have results for this agency', static_feed_id)

							big_table[static_feed_id] = route_info_lookup[static_feed_id];
						}
					});
				}
			});

			if (Object.keys(big_table).length > 0) {
				let mergetable = Object.assign({}, ...Object.values(big_table));

				// console.log('vehicle data', vehiclesData[realtime_id])

				//render each vehicle vehiclesData[realtime_id].entity

				//console.log('mergetable', mergetable)

				let features = vehiclesData[realtime_id].entity
				
				.filter((entity: any) => entity.vehicle !== null && entity.vehicle !== undefined)
					.filter((entity: any) => entity.vehicle?.position !== null && entity.vehicle?.position !== undefined)
					//no vehicles older than 10 min
				//	.filter((entity: any) => entity.vehicle?.timestamp < Date.now() / 1000 - 600)
					.map((entity: any) => {
						const { id, vehicle } = entity;
						//default to bus type
						let routeType = 3;

						let colour = '#aaaaaa';

						let headsign = ""

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

						if (realtime_id === "f-mta~nyc~rt~mnr" || realtime_id === "f-mta~nyc~rt~lirr") {
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
												headsign = trips_per_agency[static_feed_id_to_use][vehicle.trip.tripId].trip_headsign;

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
										if (vehicle.trip.tripId) {
											fetch(
												`https://backend.catenarymaps.org/gettrip?feed_id=${static_feed_id_to_use}&trip_id=${vehicle.trip.tripId}`
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
							}
							 else {
								maptag = "Bruin-No Route"
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

						if ( realtime_id === "f-mta~nyc~rt~lirr") {
							let temp1 = tripIdLabel.split('_');

							console.log('lirr temp', temp1)

							tripIdLabel = temp1[temp1.length - 1]
						}

						if (mergetable[routeId]) {
							if (mergetable[routeId].short_name) {
								maptag = (mergetable[routeId].short_name);
							} else {
								if (mergetable[routeId.long_name]) {
									maptag = (mergetable[routeId].long_name);
									console.log('overruled as long name', maptag)
								}
							}

						
						

						if (realtime_id === "f-mta~nyc~rt~mnr" || realtime_id === "f-mta~nyc~rt~lirr") {
							maptag = mergetable[routeId].long_name.replace(/branch/ig, "").trim();
						}
						}

						maptag = maptag.replace(/( )?Line/, '');

						maptag = maptag.replace(/counterclockwise/i, '-ACW').replace(/clockwise/i, '-CW');

						//let tripIdLabel = vehicle?.trip?.tripId;

						let vehiclelabel = vehicle?.vehicle?.label || vehicle?.vehicle?.id || '';

						if (realtime_id === 'f-mta~nyc~rt~bustime') {
							vehiclelabel = vehiclelabel.replace(/mta( )?/i, "");
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
		console.log('run settings adapt', layersettings);
		if (mapglobal) {
			let busshapes = mapglobal.getLayer('busshapes');
			let buslabelshapes = mapglobal.getLayer('labelbusshapes');

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
						interpretLabelsToCode(layersettings.bus.label)
					);
				} else {
					mapglobal.setLayoutProperty('buses', 'visibility', 'none');
					mapglobal.setLayoutProperty('labelbuses', 'visibility', 'none');
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
						interpretLabelsToCode(layersettings.rail.label)
					);
				} else {
					mapglobal.setLayoutProperty('raillayer', 'visibility', 'none');
					mapglobal.setLayoutProperty('labelrail', 'visibility', 'none');
				}
			}
		}

		localStorage.setItem(layersettingsnamestorage, JSON.stringify(layersettings));

		let railvehicles = mapglobal.getLayer('raillayer');

		let busvehicles = mapglobal.getLayer('buses');

		let hidevehiclecommand =  ['has','tripIdLabel']

		if (busvehicles) {
			console.log('found bus vehicles layer')
			if (showzombiebuses === true) {
				//set filter to none
				mapglobal.setFilter('buses', true);
				mapglobal.setFilter('labelbuses', true)
			} else {
				console.log('hiding buses')
				mapglobal.setFilter('buses', hidevehiclecommand);
				mapglobal.setFilter('labelbuses', hidevehiclecommand);
			}
		} else {
			console.error('no bus vehicles layer')
		}
		if (railvehicles) {
			if (showzombiebuses === true) {
				//set filter to none
				mapglobal.setFilter('raillayer', true);
				mapglobal.setFilter('labelrail', true)
			} else {
				mapglobal.setFilter('raillayer', hidevehiclecommand);
				mapglobal.setFilter('labelrail', hidevehiclecommand);
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

	function numberForBearingLengthBus(zoom: number) {
		if (zoom < 11) {
			return 800;
		}

		if (zoom < 12) {
			return 400;
		}

		if (zoom < 12.5) {
			return 250;
		}

		if (zoom < 13) {
			return 160;
		}

		if (zoom < 14) {
			return 120;
		}

		if (zoom < 15) {
			return 80;
		}

		if (zoom < 17) {
			return 50;
		}

		return 20;
	}

	function numberForBearingLengthRail(zoom: number) {
		if (zoom < 10) {
			return 1700;
		}

		if (zoom < 11) {
			return 1000;
		}

		if (zoom < 12) {
			return 500;
		}

		if (zoom < 12.5) {
			return 300;
		}

		if (zoom < 13) {
			return 180;
		}

		if (zoom < 14) {
			return 120;
		}

		if (zoom < 15) {
			return 90;
		}

		if (zoom < 17) {
			return 60;
		}

		return 30;
	}

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
			style:
				style, // stylesheet location
			accessToken:
			!window.location.search.includes('sat') ? decode('ꉰ騮罹縱𒁪险ꌳ轳罘蹺鴲靰繩繳穭葩罩陪筪陳繪輰艈艷繄艺筮陷荘靨ꍄ荲鵄繫敮謮轤𔕰𖥊浊豧扁缭𠁎詫鐵ᕑ')
		: decode(decode('𠿪𦾰𣒨𤏧𦶹𣞸𡣰𣂁𡿩𦺩𣢬𢏩𦺵𣎭𡻩𦲰𠶙𡿩𧂬𣎍𣿧𧚨𡮔𦺩𢾹𣿧𦶓𣲸𡏨𦺭𣦽𡿦𦺇𣖹𡣰𣒅𡏨𦶸𠪙𡻩𦺲𡪙𢏩𧚺𠺓𦺲𣆹𢿨𦺘𣢼𢟩𦾗𣞜𢻨𦾳𢾭𡏦𧚑𢞖𦾐𡖑𣟩𧚘𠞒𦲍𣞠𡏪𦲫𡂡𡿨𦲭𣶙𡳰𡞡𡿨ᖬ')),
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
					busbearings.setData(newbearingdata);
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
		})

		map.on('moveend', (events) => {
			let feedresults = determineFeeds(map, static_feeds, operators, realtime_feeds, geolocation);
			//	console.log('feedresults', feedresults)

			static_feeds_in_frame = feedresults.static_data_obj;
			operators_in_frame = feedresults.operators_data_obj;
			realtime_feeds_in_frame = feedresults.realtime_feeds_data_obj;
			realtime_list = feedresults.r;
		});

		map.on('touchmove', (events) => {
			lasttimeofnorth = 0
		})

		map.on('mousemove', (events) => {
			lasttimeofnorth = 0
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
				fetch("https://kactus.catenarymaps.org/gtfsrttimes")
				.then(x => x.json())
				.then((feeds: any) => {
					feeds.forEach((feed:any) => {
						if (feed.vehicles != null) {
							avaliablerealtimevehicles_temp.add(feed.feed)
						}
						if (feed.trips != null) {
							avaliablerealtimetrips_temp.add(feed.feed)
						}
						if (feed.alerts != null) {
							avaliablerealtimealerts_temp.add(feed.feed)
						}
					})

					avaliablerealtimevehicles = avaliablerealtimevehicles_temp;
					avaliablerealtimetrips = avaliablerealtimetrips_temp;
					avaliablerealtimealerts = avaliablerealtimealerts_temp;
					fetchedavaliablekactus = true;
				})
				.catch((error) => console.error(error))
			}
		}

		fetchKactus();

		map.on('load', () => {
			// Add new sources and layers
			let removelogo1 = document.getElementsByClassName('mapboxgl-ctrl-logo');

			if (removelogo1) {
				removelogo1[0].remove();
			}

			fetchKactus();

			map.addSource('static_feeds', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			fetch('https://backend.catenarymaps.org/getinitdata')
				.then(async (x) => await x.json())
				.then((x) => {
					static_feeds = x.s;
					operators = x.o;
					realtime_feeds = x.r;
				})
				.catch((e) => {
					console.error(e);
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
				url: 'https://martin.catenarymaps.org/static_feeds'
			})

			
			const urlParams = new URLSearchParams(window.location.search);

			map.addLayer({
				id: 'static_hull_calc',
				type: 'fill',
				source: 'static_feeds_hull',
				"source-layer": 'static_feeds',
				//filter: ["==", ['get', 'onestop_feed_id'], 'f-anteaterexpress'],
				paint: {
					'fill-color': '#0055aa',
					'fill-opacity': 0
				}
			})

			if (urlParams.get('debug')) {

				map.showTileBoundaries = true;

				map.addLayer({
				id: 'static_hull_calc_line',
				type: 'line',
				"source-layer": "static_feeds",
				
			
				source: 'static_feeds_hull',
				paint: {
					'line-color': '#22aaaa',
					'line-opacity': 1,
					
				}
			})


				map.addLayer({
					id: 'static_feed_calc_names',
					type: 'symbol',
					source: 'static_feeds_hull',
					"source-layer": "static_feeds",
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

			map.addSource('shapes', {
				type: 'vector',
				url: 'https://martin.catenarymaps.org/shapes'
			});

			map.addSource('stops', {
				type: 'vector',
				url: 'https://martin.catenarymaps.org/stops'
			})


			

			map.addLayer({
				id: 'busshapes',
				type: 'line',
				source: 'shapes',
				'source-layer': 'shapes',
				filter: processUrlLimit([
					'all',
					['==', 3, ['get', 'route_type']],
					['!=', ['get', 'onestop_feed_id'], 'f-9-flixbus'],
				]),
				paint: {
					'line-color': ['concat', '#', ['get', 'color']],
					'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 14, 2.6],
					//'line-opacity': ['step', ['zoom'], 0.7, 7, 0.8, 8, 0.9]
					//'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 7, 0.9]
					'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.2, 10, 0.4]
				},
				minzoom: 3
			});


								// the layer must be of type 'line'
			
				

			map.addLayer({
				id: 'ferryshapes',
				type: 'line',
				source: 'shapes',
				'source-layer': 'shapes',
				filter: ['==', 4, ['get', 'route_type']],
				paint: {
					'line-color': ['concat', '#', ['get', 'color']],
					'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 14, 2.6],
					'line-dasharray': [2, 1],
					//'line-opacity': ['step', ['zoom'], 0.7, 7, 0.8, 8, 0.9]
					//'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 7, 0.9]
					'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.2, 10, 0.4]
				},
				minzoom: 3
			});

			map.addLayer({
				id: 'labelbusshapes',
				type: 'symbol',
				source: 'shapes',
				'source-layer': 'shapes',
				filter: processUrlLimit([
					'all',
					['==', 3, ['get', 'route_type']],
					['!=', ['get', 'onestop_feed_id'], 'f-9-flixbus'],
				]),
				layout: {
					'symbol-placement': 'line',
					'text-field': ['coalesce', ['get', 'route_label']],
					//'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
					'text-font': ['literal', ['Open Sans Regular', 'Arial Unicode MS Regular']],
					'text-size': ['interpolate', ['linear'], ['zoom'], 8, 6, 9, 7, 13, 11],
					'text-ignore-placement': false,
					'text-allow-overlap': false,
					'symbol-spacing': window?.innerWidth > 750 ? 
					['step', ['zoom'], 200, 12, 120, 13, 130, 15, 130, 20, 200]
					: 
					['step', ['zoom'], 200, 12, 100, 13, 110, 15, 100, 20, 200],
					visibility: 'none'
				},
				paint: {
					'text-color': ['concat', '#', ['get', 'text_color']],
					
					'text-halo-color': ['concat', '#', ['get', 'color']],
					'text-halo-width': 3,
					'text-halo-blur': 0,
					'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.8, 10, 1]
				},
				minzoom: 3
			});

			map.addLayer({
				id: 'railshapes',
				type: 'line',
				source: 'shapes',
				'source-layer': 'shapes',
				filter: processUrlLimit(['all', ['!=', 4, ['get', 'route_type']],
				 ['!=', 3, ['get', 'route_type']]]),
				paint: {
					'line-color': ['concat', '#', ['get', 'color']],
					'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 14, 3],
					'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 7, 0.9]
				},
				minzoom: 3
			});



			map.addLayer({
				id: 'labelrailshapes',
				type: 'symbol',
				source: 'shapes',
				'source-layer': 'shapes',
				filter: ['all', ['!=', 3, ['get', 'route_type']]],
				layout: {
					'symbol-placement': 'line',
					'text-field': ['coalesce', ['get', 'route_label']],
					//'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
					'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
					'text-size': ['interpolate', ['linear'], ['zoom'], 8, 7, 9, 9, 13, 11],
					'text-ignore-placement': false,

					'symbol-spacing': ['step', ['zoom'], 150, 13, 80, 15, 100],
					'text-allow-overlap': false,
					visibility: 'none'
				},
				paint: {
					'text-color': ['concat', '#', ['get', 'text_color']],
					
					'text-halo-color': ['concat', '#', ['get', 'color']],
					'text-halo-width': 3,
					'text-halo-blur': 1,
					'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.8, 10, 1]
				},
				minzoom: 3
			});

			
			map.addLayer({
				id: 'busstopscircle',
				type: 'circle',
				source: 'stops',
				"source-layer": "stops",
				layout: {
				},
				paint: {
					"circle-color": "#1c2636",
					"circle-radius": ['interpolate', ['linear'], ['zoom'], 11, 0.9, 12, 1.2, 13, 2],
					'circle-stroke-color': darkMode ? 
					['step', ['zoom'], '#e0e0e0', 14, '#ffffff']
					: 
					"#222222",
					'circle-stroke-width': ['step', ['zoom'], 1.2, 12.7, 2],
					'circle-stroke-opacity': ['step', ['zoom'], 0.6, 15, 0.8],
					'circle-opacity': 0.1
				},
				minzoom: window?.innerWidth >= 1023 ? 12.5 : 11
			})

			map.addLayer({
				id: 'busstopslabel',
				type: 'symbol',
				source: 'stops',
				"source-layer": "stops",
				layout: {
					'text-field': ['get', 'name'],
					'text-variable-anchor': [ 'left', 'right','top', 'bottom'],
					'text-size': ['interpolate', ['linear'], ['zoom'], 12, 6, 15, 8],
					'text-radial-offset': 0.7,
					'icon-image': ["get", "network"],
					'icon-size': 1,
					//'text-ignore-placement': false,
					//'icon-ignore-placement': false,
					//'text-allow-overlap': true,
					//'symbol-avoid-edges': false,
					'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
				},
				paint: {
					'text-color': darkMode ? "#ddd6fe" :  "#2a2a2a",
					'text-halo-color': darkMode ? '#0f172a' : '#ffffff',
					'text-halo-width': 0.4,
					
				}, minzoom: window?.innerWidth >= 1023 ? 14 : 12.4
			})


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
				}
			});

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
			});

			map.addLayer({
				id: 'buses',
				type: 'circle',
				source: 'buses',
				paint: {
					'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 2, 8, 3, 10, 4, 16, 6],
					'circle-color': ['get', 'color'],
					'circle-stroke-color': '#fff',
					'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.1, 9, 0.9],
					'circle-stroke-width': 0.8,
					'circle-opacity':
						darkMode == true ? ['interpolate', ['linear'], ['zoom'], 8, 0, 8.2, 0.7] : 0.5
				}
			});

			map.addLayer({
				id: 'labelbuses',
				type: 'symbol',
				source: 'buses',
				layout: {
					'text-field': ['get', 'maptag'],
					'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
					'text-radial-offset': 0.2,
					'text-font': [
						'step',
						['zoom'],
						['literal', ['Open Sans Regular', 'Arial Unicode MS Regular']],
						12,
						['literal', ['Open Sans Medium', 'Arial Unicode MS Medium']],
						15,
						['literal', ['Open Sans Bold', 'Arial Unicode MS Bold']]
					],

					'text-size': window?.innerWidth >= 1023  ? 
					['interpolate', ['linear'], ['zoom'], 9, 8, 11, 10, 13, 14] :
					['interpolate', ['linear'], ['zoom'], 9, 8, 10, 8, 11, 10, 13, 12]
					
					,
					'text-ignore-placement': ['step', ['zoom'], false, 9.5, true]
				},
				paint: {
					'text-color': textColorOfMapLabels(),
					//'text-color': ['get', 'color'],
					//'text-halo-color': '#eaeaea',
					'text-halo-color': darkMode == true ? '#1d1d1d' : '#eaeaea',
					'text-halo-width': 2,
					'text-halo-blur': 100,
					'text-opacity': ['interpolate', ['linear'], ['zoom'], 7.9, 0, 8, 0.8, 11, 1]
				}
			});

			map.addSource('rail', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addLayer({
				id: 'raillayer',
				type: 'circle',
				source: 'rail',
				minzoom: 7.9,
				paint: {
					'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 10, 6, 16, 10],
					'circle-color': ['get', 'color'],
					'circle-stroke-color': '#fff',
					'circle-stroke-width': 1,
					'circle-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0, 8.2, 0.8]
				}
			});

			map.addLayer({
				id: 'labelrail',
				type: 'symbol',
				source: 'rail',
				layout: {
					'text-field': ['get', 'maptag'],
					/*'text-field': [
						"concat",
						['get', 'maptag'],
						" | ",
						['get', 'vehicleId']
					],*/
					'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
					'text-radial-offset': 0.2,
					'text-font': [
						'step',
						['zoom'],
						['literal', ['Open Sans Regular', 'Arial Unicode MS Regular']],
						11,
						['literal', ['Open Sans Medium', 'Arial Unicode MS Medium']],
						13,
						['literal', ['Open Sans Bold', 'Arial Unicode MS Bold']]
					],
					'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 9, 11, 13, 15],
					'text-ignore-placement': ['step', ['zoom'], false, 9.5, true]
				},
				paint: {
					'text-color': textColorOfMapLabels(),
					//'text-halo-color': '#eaeaea',
					'text-halo-color': darkMode == true ? '#1d1d1d' : '#eaeaea',
					'text-halo-width': 2,
					'text-halo-blur': 100,
					'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.8, 10, 1]
				}
			});

			setInterval(() => {
				if (map.getZoom() >= 8) {
					realtime_list.forEach((realtime_id: string) => {
						let url = `https://kactus.catenarymaps.org/gtfsrt/?feed=${realtime_id}&category=vehicles`;

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

										rerenders_request(realtime_id);
									}
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

			map.loadImage('https://catenarymaps.org/geo-circle.png', (error, image) => {
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
						"text-allow-overlap": true,
						"text-ignore-placement": true,
					},
					paint: {
						'icon-opacity': 0.8
					}
				});
			});

			map.loadImage('https://catenarymaps.org/geo-nav.png', (error, image) => {
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
			if (lasttimezoomran < Date.now() - 800) {
				lasttimezoomran = Date.now();

				renderNewBearings();
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

					if (location.coords.accuracy) {
						let accuracyLayer = map.getSource('userpositionacc');

						if (accuracyLayer) {
							let numberofpoints: number = 64;

							let geojsondata = createGeoJSONCircle(
								[location.coords.longitude, location.coords.latitude],
								location.coords.accuracy / 1000,
								numberofpoints
							);

							accuracyLayer.setData(geojsondata);
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
			mapglobal.resetNorth()
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
				if (lockongps === true || firstmove === false) {
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
	<meta property="og:image" content="https://transitmap.kylerchin.com/screenshot1.png" />

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
	/></noscript
>

{#if typeof geolocation === 'object'}
	{#if typeof geolocation.coords.speed === 'number'}
		<div
			class="inter fixed bottom-1 z-50 rounded-sm px-2 py-1 bg-white w-content ml-2 text-black text-sm z-10"
		>
			{#if usunits == false}
			<div>
				{geolocation.coords.speed.toFixed(2)} m/s {(3.6 * geolocation.coords.speed).toFixed(2)} km/h
			</div>
			{:else}
			<div>
				{(2.23694 * geolocation.coords.speed).toFixed(2)} mph
		</div>
		{/if}
	</div>
	{/if}
{/if}
<!-- End Google Tag Manager (noscript) -->
<div id="map" style="width: 100%; height: 100%;" />

<div class="sidebar">
	{maplat.toFixed(5)}, {maplng.toFixed(5)} | Z: {mapzoom.toFixed(2)} | {current_map_heading.toFixed(2)}
</div>

<!--
<div class="sidebar">
	{maplat.toFixed(5)}, {maplng.toFixed(5)} | Z: {mapzoom.toFixed(2)}
	{#if (typeof geolocation === 'object' && typeof geolocation.coords.speed === 'number')}
		<br />
		{#if usunits == false}
			Speed: {geolocation.coords.speed.toFixed(2)} m/s {(3.6 * geolocation.coords.speed).toFixed(2)} km/h
		{:else}
			<div>
				Speed: {(2.23694 * geolocation.coords.speed).toFixed(2)} mph
			</div>
		{/if}
	{/if}
</div>-->

<div class="fixed top-4 right-4 flex flex-col gap-y-2 pointer-events-none">
	<div
	on:click={togglesettingfeature}
	on:keypress={togglesettingfeature}
	class="bg-white select-none z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
>
	<span class="material-symbols-outlined align-middle select-none"> settings </span>
</div>
	
	<div
		on:click={togglelayerfeature}
		on:keypress={togglelayerfeature}
		class="bg-white z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center"
	>
		<span class="material-symbols-outlined align-middle my-auto mx-auto select-none"> layers </span>
	</div>

	<div
	on:click={gonorth}
	on:keypress={gonorth}
	on:touchstart={gonorth}
	class="bg-white z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center"
>
	<img src={current_map_heading < 7 && current_map_heading > -7 ? "/icons/north.svg" : "/icons/compass.svg"} class='h-7'
	style={`transform: rotate(${0 - current_map_heading}deg)`}
	/>
</div>


	<div
		on:click={gpsbutton}
		on:keydown={gpsbutton}
		on:touchstart={gpsbutton}
		class="${lockongps
			? ' text-blue-500 dark:text-blue-300'
			: ' text-black dark:text-gray-50'} select-none bg-white text-gray-900 z-50 fixed bottom-4 right-4 h-16 w-16 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center clickable"
	>
		<span class="material-symbols-outlined align-middle text-lg select-none">
			{#if lockongps == true}my_location{:else}location_searching{/if}
		</span>
	</div>
</div>

<div
	class="fixed bottom-0 w-full rounded-t-lg sm:w-fit sm:bottom-4 sm:right-4 bg-yellow-50 dark:bg-gray-900 dark:text-gray-50 bg-opacity-90 sm:rounded-lg z-50 px-3 py-2 {settingsBox
		? ''
		: 'hidden'}"
>
	<div><input
		on:click={(x) => {
			handleUsUnitsSwitch();
			
			runSettingsAdapt()
		}}

		on:keydown={(x) => {
			handleUsUnitsSwitch();
			runSettingsAdapt()
		}}
		checked={usunits}
		id="us-units"
		type="checkbox"
		class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
	/>
	<label for="us-units" class="ml-2">Use US Units</label></div>

	<div><input
		on:click={(x) => {
			showzombiebuses = !showzombiebuses;

			
		runSettingsAdapt()

		}}
	
	on:keydown={(x) => {
		showzombiebuses = !showzombiebuses;

		runSettingsAdapt()
	}}
		checked={showzombiebuses}
		id="show-zombie-buses"
		type="checkbox"
		class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
	/>
	<label for="show-zombie-buses" class='ml-2'>Show Tripless Vehicles</label></div>
</div>

<div
	class="fixed bottom-0 w-full rounded-t-lg sm:w-fit sm:bottom-4 sm:right-4 bg-yellow-50 dark:bg-gray-900 dark:text-gray-50 bg-opacity-90 sm:rounded-lg z-50 px-3 py-2 {layersettingsBox
		? ''
		: 'hidden'}"
>
	<h2>Change settings of:</h2>
	<div class="rounded-xl mx-0 my-2 flex flex-row w-full text-black dark:text-white">
		<div
			on:click={() => {
				selectedSettingsTab = 'rail';
			}}
			on:keydown={() => {
				selectedSettingsTab = 'rail';
			}}
			class={`${
				selectedSettingsTab === 'rail'
				? enabledlayerstyle
					:disabledlayerstyle
			} w-1/2 py-1 px-1`}
		>
			<p class="w-full align-center text-center">Rail/Other</p>
		</div>
		<div
			on:click={() => {
				selectedSettingsTab = 'bus';
			}}
			on:keydown={() => {
				selectedSettingsTab = 'bus';
			}}
			class={`${
				selectedSettingsTab === 'bus'
					? enabledlayerstyle
					:disabledlayerstyle
			} w-1/2 py-1 px-1`}
		>
			<p class="w-full align-center text-center">Buses</p>
		</div>
	</div>

	{#if selectedSettingsTab === 'rail' || selectedSettingsTab === 'bus'}
		<div class="flex flex-row gap-x-1">
			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="shapes"
				name="Routes"
				urlicon="/routesicon.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="labelshapes"
				name="Labels"
				urlicon="/labelsicon.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="stops"
				name="Stops"
				urlicon="/stopsicon.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="stoplabels"
				name="S-Names"
				urlicon="/stoplabels.svg"
				{runSettingsAdapt}
			/>

			<Layerbutton
				bind:layersettings
				bind:selectedSettingsTab
				change="visible"
				name="Vehicles"
				urlicon="/vehiclesicon.svg"
				{runSettingsAdapt}
			/>
		</div>
		<h3 class="font-semibold text-md">Realtime Labels</h3>
		<div class="flex flex-row gap-x-1">
			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="route"
				name="Route"
				symbol="route"
				{runSettingsAdapt}
			/>
			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="trip"
				name="Trip"
				symbol="mode_of_travel"
				{runSettingsAdapt}
			/>
			<Realtimelabel
				bind:layersettings
				bind:selectedSettingsTab
				change="vehicle"
				name="Vehicle"
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
				name="Speed"
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

	.sidebar {
		background-color: var(--background);
		box-shadow: 0 0 var(--glow) var(--primary);
		color: #fff;
		padding: 6px 12px;
		font-family: monospace;
		z-index: 1;
		position: absolute;
		left: 0;
		top: 0;
		margin: 12px;
		border-radius: var(--radius);
		font-size: 10px;
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
