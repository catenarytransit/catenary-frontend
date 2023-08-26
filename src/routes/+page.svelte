<script lang="ts">

	import mapboxgl from 'mapbox-gl'
	import { onMount } from 'svelte';
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
	import { run } from 'svelte/internal';

	let route_info_lookup:any = {};
	let trips_per_agency:any = {};

	let rerenders_requested: String[] = [];

	function componentToHex(c:number) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function getColourOfVehicle(routeId:any, agency_obj:any) {
 let color = agency_obj.color;

 if (route_info_lookup[agency_obj.static_feed_id]) {
					if (routeId) {

						if (agency_obj.static_feed_id == "f-9q5-metro~losangeles") {
							if (routeId.includes("720") ||routeId.includes("754") || routeId.includes("761")) {
								color = "#d11242"
							} else {
								if (routeId.includes("901")) {
									color = "#fc4c02"
								} else if (routeId.includes("950") || routeId.includes("910")) {
									color = "#adb8bf"
								}
								else {
									color = "#e16710"
								}
							}
						} else {
							if (route_info_lookup[agency_obj.static_feed_id][routeId]) {
							let colorvalue = route_info_lookup[agency_obj.static_feed_id][routeId].color;
						if (colorvalue) {
							let splitInts = colorvalue.replace("rgb(","").replace(")", "").split(",");

							color = rgbToHex(Number(splitInts[0]),Number(splitInts[1]), Number(splitInts[2]));

							if (color === "#ffffff") {
								color = agency_obj.color;
							}
						}
						}
						}

						
					}
				}

				return color;
}

function rgbToHex(r:number, g:number, b:number) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function getRouteId(vehicle:any, agency_obj:any) {
	let routeId = vehicle?.trip?.routeId;

		let runtripfetch = false;

	if (vehicle.trip) {


					if (vehicle.trip.tripId) {
						if (routeId === null || routeId === undefined || routeId === "") {
							//console.log(vehicle.trip)
					if (typeof trips_per_agency[agency_obj.static_feed_id] === "undefined") {
						runtripfetch = true;
					} else {
						if (typeof trips_per_agency[agency_obj.static_feed_id][vehicle?.trip?.tripId] === "undefined") {
							runtripfetch = true;
						} else {
							routeId = trips_per_agency[agency_obj.static_feed_id][vehicle?.trip?.tripId].route_id;
						}
					}

					if (runtripfetch === true) {
								
								fetch(`https://transitbackend.kylerchin.com/gettrip?feed_id=${agency_obj.static_feed_id}&trip_id=${vehicle.trip.tripId}`)
								.then((x) => x.json())
								.then((data) => {
									if (data.length > 0) {
	
										if (typeof trips_per_agency[agency_obj.static_feed_id] === "undefined") {
											trips_per_agency[agency_obj.static_feed_id] = {}
										}
	
										trips_per_agency[agency_obj.static_feed_id][vehicle?.trip?.tripId] = data[0];
										if (rerenders_requested.includes(agency_obj.static_feed_id)){
											rerenders_requested.push(agency_obj.static_feed_id);
										}
									}
								})
								
					}
				}
					}
					}

					return routeId;
}

function getMaptag(routeId:any,static_feed_id:any, feed_id: any) {
	//label the vehicles
				//if a better short name is avaliable, use it!
				var maptag:String = "";

				
					if (routeId) {
						if (route_info_lookup[static_feed_id][routeId]) {
						let short_name = route_info_lookup[static_feed_id][routeId].short_name;

						if (short_name) {
							if (short_name.trim().length > 0) {
								if (short_name.length < routeId.length) {
								maptag = short_name;
							}
							}
							
						}
					}
					}

					if (maptag === "") {
						if (routeId) {
							maptag = routeId;
						}
					}
				

				maptag = maptag.replace(/ Line/, "");

				if (feed_id === "f-metro~losangeles~rail~rt") {

					let railletters:any = {
						"801": "A",
						"802": "B",
						"803": "C",
						"804": "E",
						"805": "D",
						"807": "K"
					}

					if (Object.keys(railletters).includes(routeId)) {
						maptag = railletters[routeId];
					}
				}

				return maptag;
}
	
	let lasttimezoomran = 0;

	function calculateNewCoordinates(latitude:number, longitude:number, bearing:number, distance:number) {
  // taken from: https://stackoverflow.com/a/46410871/13549 
      // distance in KM, bearing in degrees
    
      const R = 6378.1; // Radius of the Earth
      const brng = bearing * Math.PI / 180; // Convert bearing to radian
      let lat = latitude * Math.PI / 180; // Current coords to radians
      let lon = longitude * Math.PI / 180;
    
      // Do the math magic
      lat = Math.asin(Math.sin(lat) * Math.cos(distance / R) + Math.cos(lat) * Math.sin(distance / R) * Math.cos(brng));
      lon += Math.atan2(Math.sin(brng) * Math.sin(distance / R) * Math.cos(lat), Math.cos(distance / R) - Math.sin(lat) * Math.sin(lat));
    
      // Coords back to degrees and return
      return {latitude: (lat * 180 / Math.PI), longitude: (lon * 180 / Math.PI)};
}

const convertArrayToObject = (array:any[], key:string) => {
  const initialValue = {};
  return array.reduce((obj, item) => {
    return {
      ...obj,
      [item[key]]: item,
    };
  }, initialValue);
};


let agencies = [
				/*
				{
					feed_id: 'f-octa~rt',
					agency_name: 'Orange County Transportation Authority',
					color: '#00AFF2'
				},
				*/
				{
					feed_id: 'f-metro~losangeles~bus~rt',
					agency_name: 'Los Angeles Metro',
					color: '#E16710',
					static_feed_id: "f-9q5-metro~losangeles"
				},
				{
					feed_id: "f-sf~bay~area~rg",
					agency_name: 'Bay Area Rapid Transit',
					color: '#000000',
					static_feed_id: "f-sf~bay~area~rg"
				},
				{
					feed_id: 'f-metro~losangeles~rail~rt',
					agency_name: 'Los Angeles Metro',
					color: '#E16710',
					static_feed_id: "f-9q5-metro~losangeles~rail"
				},
				{
					color: "#801f3b",
					feed_id: "f-longbeachtransit~rt",
					agency_name: "Long Beach Transit",
					static_feed_id: "f-9q5b-longbeachtransit"
				},
				{
					feed_id: 'f-foothilltransit~rt',
					color: '#2c6a4f',
					agency_name: 'Foothill Transit',
					static_feed_id: "f-9qh1-foothilltransit"
				},
				{
					static_feed_id: "f-9qh-metrolinktrains",
					feed_id: "f-metrolinktrains~rt",
					agency_name: "Metrolink Trains",
					color: "#006066"
				},
				{
					feed_id: "f-bigbluebus~rt",
					color: '#0039A6',
					agency_name: 'Big Blue Bus',
					static_feed_id: "f-9q5c-bigbluebus"
				},
				{
					"feed_id": "f-northcountrytransitdistrict~rt",
					color: "#004cab",
					agency_name: "North County Transit District",
					static_feed_id: "f-9mu-northcountytransitdistrict"
				},
				{
					"feed_id": "f-mts~rt~onebusaway",
					agency_name: "San diego MTS",
					//f-9mu-mts
					color: "#555555",
					static_feed_id: "f-9mu-mts"
				},
				{
					"feed_id": "f-montebello~bus~rt",
					static_feed_id: "f-montebello~bus",
					color: "#555555"
				},
				{
					"feed_id": "f-torrancetransit~rt",
					static_feed_id: "f-9q5b-torrancetransit",
					color: "#555555"
				},
				{
					"static_feed_id": "f-c28-nstranslinkca",
					"feed_id": "f-translink~rt",
					color: "#005daa"
				},
				{
					"static_feed_id": "f-c23-soundtransit",
					feed_id: "f-soundtransit~rt",
					color: "#555555"
				}
				/*
				
				{
					feed_id: "f-calgarytransit~rt",
					color: "#c9072a",
					agency_name: "Calgary Transit"
				}
				*/
			];

function numberForBearingLengthBus(zoom:number) {
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
		return 80;
	}

	if (zoom < 17) {
		return 50;
	}


	return 20;
}

function numberForBearingLengthRail(zoom:number) {
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
		return 80;
	}

	if (zoom < 17) {
		return 50;
	}


	return 20;
}

	function flatten(arr:any) {
  return arr.reduce(function (flat:any, toFlatten:any) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

	let geolocation: GeolocationPosition;

	let lastknownheading: number;

	onMount(() => {
		const API_KEY = 'tf30gb2F4vIsBW5k9Msd';

		let rtFeedsTimestampsVehicles: any = new Object();
		let rtFeedsHashVehicles:any = new Object();

			
		let dark = "https://api.maptiler.com/maps/68c2a685-a6e4-4e26-b1c1-25b394003539";

		let light = "https://api.maptiler.com/maps/dbb80139-208d-449f-a69e-31243c0ee779";

		let style = ""

	//	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    
	if (false) {
		// dark mode
	style=dark;

} else {
	style=light;
}

		agencies.forEach((agency) => {
			fetch("https://transitbackend.kylerchin.com/getroutesperagency?feed_id=" + agency.static_feed_id)
			.then((x) => x.json())
			.then((x) => {
				route_info_lookup[agency.static_feed_id] = convertArrayToObject(x, "route_id");
			})
			.catch((e) => {
				console.error(e);
			})
		})

		const map = new mapboxgl.Map({
			container: 'map',
			style: 'mapbox://styles/kylerschin/cllpbma0e002h01r6afyzcmd8', // stylesheet location
			accessToken: 'pk.eyJ1Ijoia3lsZXJzY2hpbiIsImEiOiJjajFsajI0ZHMwMDIzMnFwaXNhbDlrNDhkIn0.VdZpwJyJ8gWA--JNzkU5_Q',
			center: [-118, 33.9], // starting position [lng, lat]
			zoom: 8 // starting zoom
		});

		map.on('load', () => {
			// Add new sources and layers
			

			map.addSource('buses', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

							map.addSource('busbearings', {
				'type': 'geojson',
				'data': {
				'type': 'Feature',
				'properties': {},
				'geometry': {
				'type': 'LineString',
				'coordinates': [
				]
				}
				}
				});

				

				map.addLayer({
				'id': 'busbearingslayer',
				'type': 'line',
				'source': 'busbearings',
				'layout': {
				//'line-join': 'round',
				//'line-cap': 'round'
				},
				'paint': {
				'line-color': ['get', 'color'],
				'line-width': [
                 "interpolate",
                 ["linear"],
                 ["zoom"],
				 9,
				 1,
				 10,
				 1.2,
				 13,
				2
              ],
				'line-opacity': [
                 "interpolate",
                 ["linear"],
                 ["zoom"],
				 6,
				 0,
				 7,
				 0.9
              ],
				
				}
				});

				map.addSource('railbearings', {
				'type': 'geojson',
				'data': {
				'type': 'Feature',
				'properties': {},
				'geometry': {
				'type': 'LineString',
				'coordinates': [
				]
				}
				}
				});

				

				map.addLayer({
				'id': 'railbearingslayer',
				'type': 'line',
				'source': 'railbearings',
				'layout': {
				//'line-join': 'round',
				//'line-cap': 'round'
				},
				'paint': {
				'line-color': ['get', 'color'],
				'line-width': [
                 "interpolate",
                 ["linear"],
                 ["zoom"],
				 9,
				 2,
				 10,
				 2,
				 13,
				3
              ],
				'line-opacity': [
                 "interpolate",
                 ["linear"],
                 ["zoom"],
				 6,
				 0,
				 7,
				 0.9
              ],
				
				}
				});

				map.addLayer({
				id: 'buses',
				type: 'circle',
				source: 'buses',
				paint: {
					'circle-radius': [
                 "interpolate",
                 ["linear"],
                 ["zoom"],
				 7,
				 2,
				 8,
				 3,
		                 10,
                 4,
                 16,
                 6,
              ],
					'circle-color': ['get', 'color'],
					'circle-stroke-color': '#fff',
					'circle-stroke-opacity': [
						"interpolate",
						["linear"],
						["zoom"],
						8,
						0.1,
						9,
						0.9
					],
					'circle-stroke-width': 0.8,
					'circle-opacity': 0.5
				}
			});
		

			map.addLayer({
				id: "labelbuses",
				type: "symbol",
				source: 'buses',
				layout: {
					'text-field': ['get', 'maptag'],
					'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                'text-radial-offset': 0.2,
				'text-font': [
  "step",
  ["zoom"],
  [
    "literal",
    [
      "Open Sans Regular",
      "Arial Unicode MS Regular"
    ]
  ],
  10,
  [
    "literal",
    [
      "Open Sans Medium",
      "Arial Unicode MS Medium"
    ]
  ],
  14,
  [
    "literal",
    [
      "Open Sans Bold",
      "Arial Unicode MS Bold"
    ]
  ]
],
				'text-size': [
					"interpolate",
					["linear"],
					["zoom"],
					8,
					8,
					9,
					10,
					13,
					14
				],
				'text-ignore-placement': [
					'step',
					["zoom"],
					false,
					9.5,
					true
				]
				},
				paint: {
					'text-color': ['get', 'color'],
					'text-halo-color': "#eaeaea",
					//'text-halo-color': "#1d1d1d",
					'text-halo-width': 2,
					'text-halo-blur': 100,
					'text-opacity': [
					"interpolate",
					["linear"],
					["zoom"],
					6,
					0,
					7,
					0.8,
					10,
					1
				],
				},
			})

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
					'circle-radius': [
                 "interpolate",
                 ["linear"],
                 ["zoom"],
                 10,
                 6,
                 16,
                 10,
              ],
					'circle-color': ['get', 'color'],
					'circle-stroke-color': '#fff',
					'circle-stroke-width': 1,
					'circle-opacity': 0.8
				}
			});

			map.addLayer({
				id: "labelrail",
				type: "symbol",
				source: 'rail',
				layout: {
					'text-field': ['get', 'maptag'],
					'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                'text-radial-offset': 0.2,
				'text-font': [
  "step",
  ["zoom"],
  [
    "literal",
    [
      "Open Sans Regular",
      "Arial Unicode MS Regular"
    ]
  ],
  11,
  [
    "literal",
    [
      "Open Sans Medium",
      "Arial Unicode MS Medium"
    ]
  ],
  13,
  [
    "literal",
    [
      "Open Sans Bold",
      "Arial Unicode MS Bold"
    ]
  ]
],
				'text-size': [
					"interpolate",
					["linear"],
					["zoom"],
					8,
					10,
					9,
					11,
					13,
					15
				],
				'text-ignore-placement': [
					'step',
					["zoom"],
					false,
					9.5,
					true
				]
				},
				paint: {
					'text-color': ['get', 'color'],
					'text-halo-color': "#eaeaea",
					//'text-halo-color': "#1d1d1d",
					'text-halo-width': 2,
					'text-halo-blur': 100,
					'text-opacity': [
					"interpolate",
					["linear"],
					["zoom"],
					6,
					0,
					7,
					0.8,
					10,
					1
				],
				},
			})

			map.addSource('geolocation', {
'type': 'geojson',
'data': {
'type': 'FeatureCollection',
'features': [
{
'type': 'Feature',
'geometry': {
'type': 'Point',
'coordinates': [0,0]
}
}
]
}
});
			
			map.loadImage(
'https://transitmap.kylerchin.com/geo-circle.png',
(error, image) => {
if (error) throw error;
 
// Add the image to the map style.
map.addImage('geocircle', image);

			map.addLayer({

				id: "nobearing_position",	
				'type': 'symbol',
'source': 'geolocation', // reference the data source
'layout': {
'icon-image': 'geocircle', // reference the image
'icon-size': 0.1,
'visibility': 'none'
},
'paint': {
	
"icon-opacity": 0.8
}
			});

		});


		map.loadImage(
'https://transitmap.kylerchin.com/geo-nav.png',
(error, image) => {
if (error) throw error;
		// Add the image to the map style.
map.addImage('geonav', image);

map.addLayer({

	id: "bearing_position",	
	'type': 'symbol',
'source': 'geolocation', // reference the data source
'layout': {
'icon-image': 'geonav', // reference the image
'icon-size': 0.13,
'icon-rotate': ['get', 'bearing'],
'visibility': 'none'
},
'paint': {

"icon-opacity": 0.8
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

let bottomright = document.getElementsByClassName("mapboxgl-ctrl-bottom-right");

if (bottomright) {
	if (bottomright[0] != undefined) {
		
	bottomright[0].remove();
	}
}

console.log('requested rerender of ', rerenders_requested)

agencies.forEach((agency_obj: any) => {

	let url = `https://kactusapi.kylerchin.com/gtfsrt/?feed=${agency_obj.feed_id}&category=vehicles&skipfailure=true`;

	
		if (rtFeedsTimestampsVehicles[agency_obj.feed_id] != undefined) {
		url = url + "&timeofcache=" + rtFeedsTimestampsVehicles[agency_obj.feed_id];
	}

	if (rtFeedsHashVehicles[agency_obj.feed_id] != undefined) {
		url = url + "&bodyhash=" + rtFeedsHashVehicles[agency_obj.feed_id];
	}

	fetch(
		url
	)
		.then(async (response) => {

			rerenders_requested = rerenders_requested.filter((x) => x != agency_obj.feed_id);
			
			let mapzoomnumber = numberForBearingLengthBus(map.getZoom())
			

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

			const features = feed.entity.filter((entity) => entity.vehicle?.position !== null).map((entity: any) => {
				const { id, vehicle } = entity;

				//console.log('entity', entity);

				//console.log('has trip', vehicle.trip);

				

				let routeType = 3;

				let routeId = getRouteId(vehicle, agency_obj);
			
				if (route_info_lookup[agency_obj.static_feed_id]) {
					if (routeId) {
						
					routeType = route_info_lookup[agency_obj.static_feed_id][routeId].route_type;
					}
				}

				let color = getColourOfVehicle(routeId, agency_obj);

				let maptag = getMaptag(routeId,agency_obj.static_feed_id,agency_obj.feed_id);
 
				return {
					type: 'Feature',
					id,
					properties: {
						...vehicle,
						color: color,
						label: vehicle?.vehicle?.label,
						maptag: maptag?.replace("-13168", ""),
						routeType,
						routeId: routeId?.replace("-13168", ""),
						bearing: vehicle?.position?.bearing,
						tripId: vehicle?.trip?.tripId
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
					features: flattenedarray.filter((x:any) => x.properties.routeType === 3)
				});

				if (typeof getrailsource != 'undefined') {
					getrailsource.setData({
						type: "FeatureCollection",
					features: flattenedarray.filter((x:any) => x.properties.routeType != 3)
					})
				}

				//console.log('set data of bearings');

				
						
			let mapzoomnumber = numberForBearingLengthBus(map.getZoom())
				
				let newbearingdata = {
					type: 'FeatureCollection',
					features: flattenedarray.filter((x: any) => x.properties.bearing != undefined)
					.filter((x: any) => x.properties.bearing != 0)
					.map((x: any) => {
						let newcoords = calculateNewCoordinates(x.geometry.coordinates[1], x.geometry.coordinates[0], x.properties.bearing, (mapzoomnumber) / 1000)

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
								color: x.properties.color
							}
						}
					})
				};

				//console.log('newbearingdata', newbearingdata)

				map.getSource("busbearings").setData(newbearingdata)
			}
		}})
		.catch((e) => {
			console.error(e);
		});
			}

)

if (rerenders_requested.length > 0) {
	rerenders_requested.forEach(x => {

	})
}

}, 2000);
});

			let geometryObj:any = new Object();

			map.on('idle', () => {

				if (lasttimezoomran < Date.now() - 800) {

					lasttimezoomran = Date.now();

					let flattenedarray = flatten(Object.values(geometryObj));

					console.log(flattenedarray);

					let mapzoomnumber = numberForBearingLengthBus(map.getZoom())
					let newbearingdata = {
									type: 'FeatureCollection',
									features: flattenedarray.filter((x: any) => x.properties.bearing != undefined)
									.filter((x: any) => x.properties.bearing != 0)
									.map((x: any) => {

										let newcoords = calculateNewCoordinates(x.geometry.coordinates[1], x.geometry.coordinates[0], x.properties.bearing, mapzoomnumber / 1000)

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
												color: x.properties.color
											}
										}
									})
								};

								console.log('newbearingdata', newbearingdata)

								map.getSource("busbearings").setData(newbearingdata)
				}

				
			})

			

		const successCallback = (position: any) => {
			//console.log(position);

			let location = position;


					if (location) {
						geolocation = location;

						console.log(geolocation);

						let geolocationdata = map.getSource('geolocation');

						

						if (geolocationdata) {
							geolocationdata.setData({
							'type': 'FeatureCollection',
							'features': [
							{
							'type': 'Feature',
							'geometry': {
							'type': 'Point',
							'coordinates': [location.coords.longitude, location.coords.latitude]
							},
							'properties': {
								'accuracy': location.coords.accuracy,
								'heading': location.coords.heading
							}
							}
							]
							})
						}

						if (false) {
							console.log('bearing is', location.coords.heading)

							

							map.setLayoutProperty("nobearing_position", 'visibility', 'none');
							
							map.setLayoutProperty("bearing_position", 'visibility', 'visible');							
						} else {
							map.setLayoutProperty("nobearing_position", 'visibility', 'visible');
							
							map.setLayoutProperty("bearing_position", 'visibility', 'none');
						}
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

	
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
{#if typeof geolocation === "object"}
{#if typeof geolocation.coords.speed === "number"} 


<div class="inter fixed bottom-1 z-50 w-auto rounded-sm px-2 py-1 bg-white w-content ml-2  text-black text-sm z-10"><div>
	{geolocation.coords.speed.toFixed(2)} m/s {(3.6 * geolocation.coords.speed).toFixed(2)} km/h
</div></div>
{/if}

{/if}

<div id="map" style="width: 100%; height: 100%;" />


<style>
	.inter {
		font-family: 'Inter', sans-serif;
	}

	#map {
		width: 100%;
		height: 100%;
	}
</style>
