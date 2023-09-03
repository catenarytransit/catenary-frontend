<script lang="ts">
	import { calculateNewCoordinates, createGeoJSONCircle, componentToHex } from '../geoMathsAssist';
	import mapboxgl from 'mapbox-gl';
	import { onMount } from 'svelte';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
	import { construct_svelte_component, run } from 'svelte/internal';

	import { browser } from '$app/environment';

let darkMode = true;
let usunits = false;

function handleUsUnitsSwitch() {
	usunits = !usunits;

	localStorage.setItem('units', usunits ? 'us' : 'metric');
}

if (browser) {
	if (localStorage.getItem('units') === "us") {
		usunits = true;
	} else {
		usunits = false;
	}
}

function hexToRgb(hex:string) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function textColorOfMapLabels() {
	return ['get', darkMode === true ? 'contrastdarkmode' : 'color']
}

function rgbToHsl(r:number, g:number, b:number) {
	r /= 255;
  g /= 255;
  b /= 255;
  const l = Math.max(r, g, b);
  const s = l - Math.min(r, g, b);
  const h = s
    ? l === r
      ? (g - b) / s
      : l === g
      ? 2 + (b - r) / s
      : 4 + (r - g) / s
    : 0;
  return {
   h: 60 * h < 0 ? 60 * h + 360 : 60 * h,
   s: 100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
   l: (100 * (2 * l - s)) / 2,
  };
}

function hslToRgb(h:number, s:number, l:number) {
	s /= 100;
  l /= 100;
  const k = (n:any) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n:any) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {r:255 * f(0), g:255 * f(8), b:255 * f(4)};
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
		document.documentElement.classList.remove('dark');
		darkMode = false;
	}
}

	let maplat: number, maplng: number, mapzoom: number;
	let route_info_lookup: any = {};
	let trips_per_agency: any = {};
	let layersettingsBox = false;

	const lockonconst = 14.5;

	let mapglobal: any;
	let firstmove = false;
	let secondrequestlockgps = false;

	let binaryDataOfGtfsRt: any = new Object();

	let lockongps = false;

	maplng = 0;
	maplat = 0;
	mapzoom = 0;

	let rerenders_requested: String[] = [];

	let layersettings = {
		bus: {
			visible: true,
			label: {
				route: true,
				trip: false,
				vehicle: false,
				headsign: false,
				direction: false,
				speed: false
			}
		},
		rail: {
			visible: true,
			label: {
				route: true,
				trip: false,
				vehicle: false,
				headsign: false,
				direction: false,
				speed: false
			}
		}
	};

	function refreshDarkMode() {
		if (mapglobal) {
			//mapglobal.setStyle(darkMode === true ? "mapbox://styles/kylerschin/clm2i6cmg00fw01of2vp5h9p5" :  'mapbox://styles/kylerschin/cllpbma0e002h01r6afyzcmd8');
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
			arrayofinfo.push(['get', 'vehicleId']);
		}

		if (label.speed) {
			arrayofinfo.push(['get', 'speed']);
		}

		return ['concat', ...interleave(arrayofinfo, '|')];
	}

	function runSettingsAdapt() {
		console.log('run settings adapt', layersettings);
		if (mapglobal) {
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
		true;
	}

	function getColourOfVehicle(routeId: any, agency_obj: any) {
		let color = agency_obj.color;

		if (route_info_lookup[agency_obj.static_feed_id]) {
			if (routeId) {
				if (agency_obj.static_feed_id == 'f-9q5-metro~losangeles') {
					if (routeId.includes('720') || routeId.includes('754') || routeId.includes('761')) {
						color = '#d11242';
					} else {
						if (routeId.includes('901')) {
							color = '#fc4c02';
						} else if (routeId.includes('950') || routeId.includes('910')) {
							color = '#adb8bf';
						} else {
							color = '#e16710';
						}
					}
				} else {
					if (route_info_lookup[agency_obj.static_feed_id][routeId]) {
						let colorvalue = route_info_lookup[agency_obj.static_feed_id][routeId].color;
						if (colorvalue) {
							let splitInts = colorvalue.replace('rgb(', '').replace(')', '').split(',');

							color = rgbToHex(Number(splitInts[0]), Number(splitInts[1]), Number(splitInts[2]));

							if (color === '#ffffff' || color === '#000000') {
								color = agency_obj.color;
							}
						}
					}
				}
			}
		}

		return color;
	}

	function rgbToHex(r: number, g: number, b: number) {
		return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
	}

	function getRouteId(vehicle: any, agency_obj: any) {
		let routeId = vehicle?.trip?.routeId;

		let runtripfetch = false;

		if (vehicle.trip) {
			if (vehicle.trip.tripId) {
				if (routeId === null || routeId === undefined || routeId === '') {
					//console.log(vehicle.trip)
					if (typeof trips_per_agency[agency_obj.static_feed_id] === 'undefined') {
						runtripfetch = true;
					} else {
						if (
							typeof trips_per_agency[agency_obj.static_feed_id][vehicle?.trip?.tripId] ===
							'undefined'
						) {
							runtripfetch = true;
						} else {
							routeId = trips_per_agency[agency_obj.static_feed_id][vehicle?.trip?.tripId].route_id;
						}
					}

					
				}

				//get route type
				if (route_info_lookup[agency_obj.static_feed_id]) {
						if (route_info_lookup[agency_obj.static_feed_id][routeId]) {
							if ([2,4].includes(route_info_lookup[agency_obj.static_feed_id][routeId].route_type)) {
								runtripfetch = true;
							}
						}
					}

					if (runtripfetch === true) {
						fetch(
							`https://transitbackend.kylerchin.com/gettrip?feed_id=${agency_obj.static_feed_id}&trip_id=${vehicle.trip.tripId}`
						)
							.then((x) => x.json())
							.then((data) => {
								if (data.length > 0) {
									if (typeof trips_per_agency[agency_obj.static_feed_id] === 'undefined') {
										trips_per_agency[agency_obj.static_feed_id] = {};
									}

									trips_per_agency[agency_obj.static_feed_id][vehicle?.trip?.tripId] = data[0];
									if (rerenders_requested.includes(agency_obj.static_feed_id)) {
										rerenders_requested.push(agency_obj.static_feed_id);
									}
								} else {
									trips_per_agency[agency_obj.static_feed_id][vehicle?.trip?.tripId] = null;
								}
							});
					}
			}
		}

		return routeId;
	}

	function getMaptag(routeId: any, agency_obj: any) {
		let static_feed_id: any = agency_obj.static_feed_id;
		let feed_id: String = agency_obj.feed_id;
		let prefer_short_name: boolean | undefined = agency_obj.prefer_short_name;
		let use_long_name: boolean | undefined = agency_obj.use_long_name;
		//label the vehicles
		//if a better short name is avaliable, use it!
		var maptag: String = '';

		if (routeId) {
			if (route_info_lookup[static_feed_id][routeId]) {
				let short_name = route_info_lookup[static_feed_id][routeId].short_name;

				if (short_name) {
					if (short_name.trim().length > 0 || prefer_short_name === true) {
						if (short_name.length < routeId.length || prefer_short_name === true) {
							maptag = short_name;
						}
					}
				}

				let long_name = route_info_lookup[static_feed_id][routeId].long_name;
				if (long_name) {
					if (use_long_name === true) {
						maptag = route_info_lookup[static_feed_id][routeId].long_name;
					}
				}
			}
		}

		if (maptag === '') {
			if (routeId) {
				maptag = routeId;
			}
		}

		if (feed_id === 'f-metro~losangeles~rail~rt' || feed_id === 'f-metrolinktrains~rt') {
			let railletters: any = {
				'801': 'A',
				'802': 'B',
				'803': 'C',
				'804': 'E',
				'805': 'D',
				'807': 'K',
				'Orange County Line': 'OC',
				'San Bernardino Line': 'SB',
				'Antelope Valley Line': 'AV',
				'Inland Emp.-Orange Co. Line': 'IEOC'
			};

			if (Object.keys(railletters).includes(routeId)) {
				maptag = railletters[routeId];
			}
		}

		maptag = maptag.replace(/( )?Line/, '');

		maptag = maptag.replace(/counterclockwise/i, '↺').replace(/clockwise/i, '↻');

		return maptag;
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

	let agencies = [
		{
			feed_id: 'f-octa~rt',
			agency_name: 'Orange County Transportation Authority',
			color: '#00AFF2',
			static_feed_id: 'f-9mu-orangecountytransportationauthority'
		},
		{
			feed_id: 'f-sf~bay~area~rg~rt',
			agency_name: 'San Francisco Bay Area Rapid Transit',
			color: '#000000',
			static_feed_id: 'f-sf~bay~area~rg'
		},
		{
			feed_id: 'f-metro~losangeles~bus~rt',
			agency_name: 'Los Angeles Metro',
			color: '#E16710',
			static_feed_id: 'f-9q5-metro~losangeles'
		},
		{
			feed_id: 'f-metro~losangeles~rail~rt',
			agency_name: 'Los Angeles Metro',
			color: '#E16710',
			static_feed_id: 'f-9q5-metro~losangeles~rail'
		},
		{
			feed_id: 'f-rta~rt',
			color: '#de1e36',
			agency_name: 'Riverside',
			static_feed_id: 'f-9qh-riversidetransitagency'
		},
		{
			color: '#801f3b',
			feed_id: 'f-longbeachtransit~rt',
			agency_name: 'Long Beach Transit',
			static_feed_id: 'f-9q5b-longbeachtransit'
		},
		{
			feed_id: 'f-foothilltransit~rt',
			color: '#2c6a4f',
			agency_name: 'Foothill Transit',
			static_feed_id: 'f-9qh1-foothilltransit'
		},
		{
			static_feed_id: 'f-9qh-metrolinktrains',
			feed_id: 'f-metrolinktrains~rt',
			agency_name: 'Metrolink Trains',
			color: '#006066'
		},
		{
			feed_id: 'f-bigbluebus~rt',
			color: '#0039A6',
			agency_name: 'Big Blue Bus',
			static_feed_id: 'f-9q5c-bigbluebus'
		},
		{
			feed_id: 'f-northcountrytransitdistrict~rt',
			color: '#004cab',
			agency_name: 'North County Transit District',
			static_feed_id: 'f-9mu-northcountytransitdistrict',
			prefer_short_name: true
		},
		{
			feed_id: 'f-mts~rt~onebusaway',
			agency_name: 'San diego MTS',
			//f-9mu-mts
			color: '#555555',
			static_feed_id: 'f-9mu-mts',
			prefer_short_name: true
		},
		{
			feed_id: 'f-montebello~bus~rt',
			static_feed_id: 'f-montebello~bus',
			color: '#555555'
		},
		{
			feed_id: 'f-torrancetransit~rt',
			static_feed_id: 'f-9q5b-torrancetransit',
			color: '#555555'
		},

		{
			static_feed_id: 'f-c28-nstranslinkca',
			feed_id: 'f-translink~rt',
			color: '#005daa'
		},
		{
			static_feed_id: 'f-9q5-ladot',
			color: '#5050a0',
			feed_id: 'f-ladot~rt',
			prefer_short_name: true
		},
		{
			static_feed_id: 'f-9q5c-culvercitybus',
			color: '#cecd71',
			feed_id: 'f-culvercitybus~rt',
			prefer_short_name: true
		},
		{
			feed_id: 'f-ucla~bruinbus~rt',
			prefer_short_name: true,
			use_long_name: true,
			static_feed_id: 'f-ucla~bruinbus'
		},
		{
			feed_id: 'f-9qd-mercedthebus~ca~us~rt',
			static_feed_id: 'f-9qd-mercedthebus~ca~us'
		},
		{
			feed_id: 'f-9q4g~santabarbaramtd~rt',
			static_feed_id: 'f-9q4g-santabarbaramtd'
		},
		/*
				{
					"static_feed_id": "f-c23-soundtransit",
					feed_id: "f-soundtransit~rt",
					color: "#555555"
				}
				
				*/
		{
			feed_id: 'f-calgarytransit~rt',
			color: '#c9072a',
			agency_name: 'Calgary Transit',
			static_feed_id: 'f-c3nf-calgarytransit'
		}
	];

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

	function flatten(arr: any) {
		return arr.reduce(function (flat: any, toFlatten: any) {
			return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
		}, []);
	}

	let geolocation: GeolocationPosition;

	let lastknownheading: number;

	onMount(() => {
		const API_KEY = 'tf30gb2F4vIsBW5k9Msd';

		let rtFeedsTimestampsVehicles: any = new Object();
		let rtFeedsHashVehicles: any = new Object();

		let dark = 'https://api.maptiler.com/maps/68c2a685-a6e4-4e26-b1c1-25b394003539';

		let light = 'https://api.maptiler.com/maps/dbb80139-208d-449f-a69e-31243c0ee779';

		let style = '';

			if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {

		//if (false) {
			// dark mode
			style = dark;
		} else {
			style = light;
		}

		agencies.forEach((agency) => {
			fetch(
				'https://transitbackend.kylerchin.com/getroutesperagency?feed_id=' + agency.static_feed_id
			)
				.then((x) => x.json())
				.then((x) => {
					route_info_lookup[agency.static_feed_id] = convertArrayToObject(x, 'route_id');
				})
				.catch((e) => {
					console.error(e);
				});
		});

		const map = new mapboxgl.Map({
			container: 'map',
			style: style === dark ? "mapbox://styles/kylerschin/clm2i6cmg00fw01of2vp5h9p5" :  'mapbox://styles/kylerschin/cllpbma0e002h01r6afyzcmd8', // stylesheet location
			accessToken:
				'pk.eyJ1Ijoia3lsZXJzY2hpbiIsImEiOiJjajFsajI0ZHMwMDIzMnFwaXNhbDlrNDhkIn0.VdZpwJyJ8gWA--JNzkU5_Q',
			center: [-118, 33.9], // starting position [lng, lat]
			zoom: 8 // starting zoom
		});

		mapglobal = map;

		function updateData() {
			mapzoom = map.getZoom();
			maplng = map.getCenter().lng;
			maplat = map.getCenter().lat;
		}

		function renderNewBearings() {
			//console.log('render new bearings');

			const features = map.queryRenderedFeatures({ layers: ['buses'] });

			let mapzoomnumber = numberForBearingLengthBus(map.getZoom());

			var start = performance.now();
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
								contrastdarkmodebearing: x.properties.contrastdarkmodebearing
							}
						};
					})
			};

			//console.log("took ", performance.now() - start, "ms")

			//console.log('newbearingdata', newbearingdata)

			map.getSource('busbearings').setData(newbearingdata);

			const railfeatures = map.queryRenderedFeatures({ layers: ['raillayer'] });

			let railmapzoomnumber = numberForBearingLengthRail(map.getZoom());

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
								bearing: x.properties.bearing,
								color: x.properties.color,
								contrastdarkmodebearing: x.properties.contrastdarkmodebearing
							}
						};
					})
			};

			//console.log('newbearingdata', newbearingdata)

			map.getSource('railbearings').setData(newrailbearingdata);
		}

		map.on('load', () => {
			// Add new sources and layers

			updateData();

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
					'line-color': ['get', darkMode === true ? "contrastdarkmodebearing" : 'color'],
					'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3, 10, 1.6, 13, 3],
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
					'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2, 10, 2, 13, 3],
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
					'circle-opacity': darkMode == true ? 0.7: 0.5,
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
						10,
						['literal', ['Open Sans Medium', 'Arial Unicode MS Medium']],
						14,
						['literal', ['Open Sans Bold', 'Arial Unicode MS Bold']]
					],
					'text-size': ['interpolate', ['linear'], ['zoom'], 8, 8, 9, 10, 13, 14],
					'text-ignore-placement': ['step', ['zoom'], false, 9.5, true]
				},
				paint: {
					'text-color': textColorOfMapLabels(),
					//'text-color': ['get', 'color'],
					//'text-halo-color': '#eaeaea',
					'text-halo-color': darkMode == true ? "#1d1d1d": "#eaeaea",
					'text-halo-width': 2,
					'text-halo-blur': 100,
					'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.8, 10, 1]
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
				paint: {
					'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 16, 10],
					'circle-color': ['get', 'color'],
					'circle-stroke-color': '#fff',
					'circle-stroke-width': 1,
					'circle-opacity': 0.8
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
					'text-halo-color': darkMode == true ? "#1d1d1d": "#eaeaea",
					'text-halo-width': 2,
					'text-halo-blur': 100,
					'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.8, 10, 1]
				}
			});

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

			map.loadImage('https://transitmap.kylerchin.com/geo-circle.png', (error, image) => {
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
						visibility: 'none'
					},
					paint: {
						'icon-opacity': 0.8
					}
				});
			});

			map.loadImage('https://transitmap.kylerchin.com/geo-nav.png', (error, image) => {
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

				agencies.forEach((agency_obj: any) => {
					let url = `https://kactusapi.kylerchin.com/gtfsrt/?feed=${agency_obj.feed_id}&category=vehicles&skipfailure=true`;

					if (rtFeedsTimestampsVehicles[agency_obj.feed_id] != undefined) {
						url = url + '&timeofcache=' + rtFeedsTimestampsVehicles[agency_obj.feed_id];
					}

					if (rtFeedsHashVehicles[agency_obj.feed_id] != undefined) {
						url = url + '&bodyhash=' + rtFeedsHashVehicles[agency_obj.feed_id];
					}

					fetch(url)
						.then(async (response) => {
							rerenders_requested = rerenders_requested.filter((x) => x != agency_obj.feed_id);

							if (response.status === 200) {
								//console.log('hash for', agency_obj.feed_id, " is ",  response.headers.get('hash'))

								//console.log(response.headers)

								rtFeedsHashVehicles[agency_obj.feed_id] = response.headers.get('hash');

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

								rtFeedsTimestampsVehicles[agency_obj.feed_id] = feed.header.timestamp;

								//console.log('feed', feed);

								const features = feed.entity
									.filter((entity) => entity.vehicle?.position !== null)
									.map((entity: any) => {
										const { id, vehicle } = entity;

										//console.log('entity', entity);

										//console.log('has trip', vehicle.trip);

										let routeType = 3;

										let routeId = getRouteId(vehicle, agency_obj);

										if (route_info_lookup[agency_obj.static_feed_id]) {
											if (routeId) {
												if (route_info_lookup[agency_obj.static_feed_id]) {
													if (route_info_lookup[agency_obj.static_feed_id][routeId]) {
														routeType =
															route_info_lookup[agency_obj.static_feed_id][routeId].route_type;
													}
												}
											}
										}

										let color = getColourOfVehicle(routeId, agency_obj);

										let contrastdarkmode = color;
										let contrastdarkmodebearing = color;

										if (color && darkMode === true) {
                                            //convert hex colour to array of 3 numbers

                                          let rgb = hexToRgb(color);

										 // console.log('rgb', rgb)

										  if (rgb != null) {

										  let hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

										 // console.log('hsl', hsl)

										  let newdarkhsl = hsl;

										  let blueoffset = 0;

										  if (rgb.b > 40) {
											blueoffset = 30 * ((rgb.b)/255);
										  }

										  if (hsl.l < 60) {
                                            newdarkhsl.l = hsl.l + 10 + (25 * ((100-hsl.s)/100) + blueoffset);

											if (hsl.l > 60 ) {

												if ( blueoffset === 0) {
													
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

										 let newdarkbearingline = hslToRgb(newdarkhsl.h, newdarkhsl.s, (newdarkhsl.l + hsl.l) / 2);

										  contrastdarkmode = `#${componentToHex(newdarkrgb.r)}${componentToHex(newdarkrgb.g)}${componentToHex(newdarkrgb.b)}`;
                                          contrastdarkmodebearing = `#${componentToHex(newdarkbearingline.r)}${componentToHex(newdarkbearingline.g)}${componentToHex(newdarkbearingline.b)}`;
                                          //  console.log('rgbtohex',contrastdarkmode)
										
										}
										}

										let maptag = getMaptag(routeId, agency_obj);

										const fixSpeed = () => {
											if (vehicle?.position?.speed) {
												if (vehicle?.position?.speed > 0) {
													if (usunits === false) {
														return (vehicle?.position?.speed * 3.6).toFixed(1);
													} else {
														return (vehicle?.position?.speed * 2.23694).toFixed(1);
													}
												}
											}

											return "";
										}

										const tripIdLabel = () => {
											let tripid = vehicle?.trip?.tripId;

											if (tripid) {
												//lookup trip_short_name
												if (trips_per_agency[agency_obj.static_feed_id]) {
													if (trips_per_agency[agency_obj.static_feed_id][tripid]) {
														let trip = trips_per_agency[agency_obj.static_feed_id][tripid];

														if (trip.trip_short_name) {
															tripid = trip.trip_short_name;
														}
													}
												}
											}

											return tripid
										}

										return {
											type: 'Feature',
											id,
											properties: {
												vehicleId: vehicle?.vehicle?.label || vehicle?.vehicle?.id,
												speed: fixSpeed(),
												color: color,
												contrastdarkmode: contrastdarkmode,
												contrastdarkmodebearing,
												label: vehicle?.vehicle?.label,
												maptag: maptag?.replace('-13168', ''),
												routeType,
												routeId: routeId?.replace('-13168', ''),
												bearing: vehicle?.position?.bearing,
												tripId: vehicle?.trip?.tripId,
												tripIdLabel: tripIdLabel()
											},
											geometry: {
												type: 'Point',
												coordinates: [vehicle.position.longitude, vehicle.position.latitude]
											}
										};
									});

								//console.log('features', features);

								const getbussource = map.getSource('buses');
								const getrailsource = map.getSource('rail');

								geometryObj[agency_obj.feed_id] = features;

								let flattenedarray = flatten(Object.values(geometryObj));

								//console.log(flattenedarray);

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

									let mapzoomnumber = numberForBearingLengthBus(map.getZoom());

									// Query all rendered features from a single layer
									renderNewBearings();
								}
							}
						})
						.catch((e) => {
							console.error(e);
						});
				});

				if (rerenders_requested.length > 0) {
					rerenders_requested.forEach((x) => {});
				}
			}, 2000);
		});

		let geometryObj: any = new Object();

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

		const successCallback = (position: any) => {
			//console.log(position);

			let location = position;

			if (location) {
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

				if (false) {
					console.log('bearing is', location.coords.heading);

					map.setLayoutProperty('nobearing_position', 'visibility', 'none');

					map.setLayoutProperty('bearing_position', 'visibility', 'visible');
				} else {
					map.setLayoutProperty('nobearing_position', 'visibility', 'visible');

					map.setLayoutProperty('bearing_position', 'visibility', 'none');
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

	let settingsBox:boolean = false;

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

					if (secondrequestlockgps === true || firstmove === false) {
						target.zoom = lockonconst;
					}

					if (firstmove === false) {
						lockongps = true;
			secondrequestlockgps = true;
					}

					mapglobal.flyTo(target);
				}
			}
		}
	}
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>Kyler's Transit Map</title>
	<link rel="icon" href="/favicon.png" />
	<meta name="title" content="Kyler's Transit Map" />
	<meta
		name="description"
		content="Realtime bus and train location tracking, stop times prediction, analysis, and routing algorithm calculations."
	/>
	<meta name="viewport" content="width=device-width, user-scalable=no" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Kyler's Transit Map" />
	<meta
		property="og:description"
		content="Realtime bus and train location tracking, stop times prediction, analysis, and routing algorithm calculations."
	/>
	<meta property="og:image" content="https://transitmap.kylerchin.com/screenshot1.png" />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content="Kyler's Transit Map" />
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

<div id="map" style="width: 100%; height: 100%;" />

<div class="sidebar">
	{maplat.toFixed(5)}, {maplng.toFixed(5)} | Z: {mapzoom.toFixed(2)}
</div>

<div class='fixed top-4 right-4 flex flex-col gap-y-2 pointer-events-none'
>

<div
	on:click={togglesettingfeature}
	on:keypress={togglesettingfeature}
	class="bg-white z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center"
>
	<span class="material-symbols-outlined align-middle"> settings </span>

	
</div>

	<div
	on:click={togglelayerfeature}
	on:keypress={togglelayerfeature}
	class="bg-white z-50 h-10 w-10 rounded-full dark:bg-gray-900 dark:text-gray-50 pointer-events-auto flex justify-center items-center "
>
	<span class="material-symbols-outlined align-middle my-auto mx-auto"> layers </span>
</div>


</div>

<div class='fixed'>
	<div
	on:click={gpsbutton}
	on:keydown={gpsbutton}
	class="${lockongps
		? ' text-blue-500 dark:text-blue-300'
		: ' text-black dark:text-gray-50'} h-16 w-16 fixed bottom-4 right-4 bg-white dark:bg-gray-900  z-50  rounded-full pointer-events-auto flex justify-center items-center"
>
	<span class="material-symbols-outlined align-middle text-lg"> {#if lockongps == true}my_location{:else}location_searching{/if} </span>
</div>
</div>

<div
	class="fixed bottom-0 w-full rounded-t-lg sm:w-fit sm:bottom-4 sm:right-4 bg-yellow-50 dark:bg-gray-900 dark:text-gray-50 bg-opacity-90 sm:rounded-lg z-50 px-3 py-2 {settingsBox
		? ''
		: 'hidden'}"
>
<input
on:click={(x) => {
	handleUsUnitsSwitch()
}}

checked={usunits}
id="us-units"
type="checkbox"
class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
/>
<label for="us-units" class="ml-2">Use US Units</label>
	</div>

<div
	class="fixed bottom-0 w-full rounded-t-lg sm:w-fit sm:bottom-4 sm:right-4 bg-yellow-50 dark:bg-gray-900 dark:text-gray-50 bg-opacity-90 sm:rounded-lg z-50 px-3 py-2 {layersettingsBox
		? ''
		: 'hidden'}"
>

<p class='text-xs'>Current Units: {#if usunits === false}metric{:else}US{/if}. Switch in settings.</p>
	<h3 class="font-bold">Rail / Other</h3>
	<div class="flex flex-row">
		<input
			on:click={(x) => {
				console.log('x is ', x);
				layersettings.rail.visible = x.target.checked;
				runSettingsAdapt();
			}}
			on:keydown={(x) => {
				console.log('x is ', x);
				layersettings.rail.visible = x.target.checked;
				runSettingsAdapt();
			}}
			checked={layersettings.rail.visible}
			id="rail"
			type="checkbox"
			class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
		/>
		<label for="rail" class="ml-2">Realtime Locations</label>
	</div>
	<div>
		<p class="font-semibold">Labels</p>
		<div class="flex flex-row md:flex-col gap-x-3">
			<div class="flex flex-row">
				<input
					on:click={(x) => {
						layersettings.rail.label.route = x.target.checked;
						runSettingsAdapt();
					}}

					checked={layersettings.rail.label.route}
					id="rail-route"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="rail-route" class="ml-2">Route</label>
			</div>
			<div class="flex flex-row">
				<input
					on:click={(x) => {
						layersettings.rail.label.trip = x.target.checked;
						runSettingsAdapt();
					}}
					checked={layersettings.rail.label.trip}
					id="rail-trip"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="rail-trip" class="ml-2">Trip Name/ID</label>
			</div>
			<!--<div class="flex flex-row">
				<input
					on:click={(x) => {
						layersettings.rail.label.headsign = x.target.checked;
						runSettingsAdapt();
					}}
					checked={layersettings.rail.label.headsign}
					id="rail-headsign"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="rail-headsign" class="ml-2">Headsign</label>
			</div>-->
			<div class="flex flex-row">
				<input
					on:click={(x) => {
						layersettings.rail.label.vehicle = x.target.checked;
						runSettingsAdapt();
					}}
					checked={layersettings.rail.label.vehicle}
					id="rail-vehicle"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="rail-vehicle" class="ml-2">Vehicle</label>
			</div>
			<div class="flex flex-row">
				<input
					on:click={(x) => {
						layersettings.rail.label.speed = x.target.checked;
						runSettingsAdapt();
					}}
					checked={layersettings.rail.label.speed}
					id="rail-speed"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="rail-speed" class="ml-2">Speed</label>
			</div>
		</div>
	</div>
	<div class="h-[1px] bg-black" />
	<h3 class="font-bold">Buses</h3>
	<div class="flex flex-row">
		<input
			on:click={(x) => {
				layersettings.bus.visible = x.target.checked;
				runSettingsAdapt();
			}}
			checked={layersettings.bus.visible}
			id="buses"
			type="checkbox"
			class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
		/>
		<label for="buses" class="ml-2">Realtime Locations</label>
	</div>
	<div>
		<p class="font-semibold">Labels</p>
		<div class="flex flex-row md:flex-col gap-x-3">
			<div class="flex flex-row">
				<input
					on:click={(x) => {
						layersettings.bus.label.route = x.target.checked;
						runSettingsAdapt();
					}}
					checked={layersettings.bus.label.route}
					id="buses-route"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="buses-route" class="ml-2">Route</label>
			</div>
			<div class="flex flex-row">
				<input
					on:click={(x) => {
						layersettings.bus.label.trip = x.target.checked;
						runSettingsAdapt();
					}}
					checked={layersettings.bus.label.trip}
					id="buses-trips"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="buses-trips" class="ml-2">Trip Name/ID</label>
			</div>
			<!--<div class="flex flex-row">
				<input
					on:click={(x) => {
						layersettings.bus.label.headsign = x.target.checked;
						runSettingsAdapt();
					}}
					checked={layersettings.bus.label.headsign}
					id="buses-headsign"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="buses-headsign" class="ml-2">Headsign</label>
			</div>-->
			<div class="flex flex-row">
				<input
					on:click={(x) => {
						layersettings.bus.label.vehicle = x.target.checked;
						runSettingsAdapt();
					}}
					checked={layersettings.bus.label.vehicle}
					id="buses-vehicles"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="buses-vehicles" class="ml-2">Vehicle</label>
			</div>
			<div class="flex flex-row">
				<input
					on:click={(x) => {
						layersettings.bus.label.speed = x.target.checked;
						runSettingsAdapt();
					}}
					checked={layersettings.bus.label.speed}
					id="buses-speed"
					type="checkbox"
					class="align-middle my-auto w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label for="buses-speed" class="ml-2">Speed</label>
			</div>
		</div>
	</div>
</div>

<style>
	.inter {
		font-family: 'Inter', sans-serif;
	}

	#map {
		width: 100%;
		height: 100%;
	}

	.sidebar {
		background-color: rgba(35, 55, 75, 0.9);
		color: #fff;
		padding: 6px 12px;
		font-family: monospace;
		z-index: 1;
		position: absolute;
		top: 0;
		left: 0;
		margin: 12px;
		border-radius: 4px;
		font-size: 10px;
	}
</style>
