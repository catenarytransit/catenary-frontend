import { componentToHex } from '../geoMathsAssist';
import { titleCase } from '../utils/titleCase';
import { writable, get } from 'svelte/store';
import {
	realtime_vehicle_locations_store,
	realtime_vehicle_route_cache_store,
	realtime_vehicle_route_cache_hash_store,
	realtime_vehicle_locations_last_updated_store,
	usunits_store
} from '../globalstores';
import {
	add_bunny_layer,
	make_custom_icon_source,
	new_jeans_buses,
	pride_buses
} from './addLayers/customIcons';
import maplibregl from 'maplibre-gl';
import {lightenColour, darkenColour } from './lightenDarkColour';
import { hexToRgb, rgbToHsl, hslToRgb } from '../utils/colour';
import {calculateGamma} from './colour/computeBrightness';
import { fixHeadsignText, fixRouteName } from './agencyspecific';
import { adjustGamma } from './colour/readjustGamma';
import { determineDarkModeToBool } from './determineDarkModeToBool';
function category_name_to_source_name(category: string): string {
	switch (category) {
		case 'bus':
			return 'buses';
		case 'rail':
			return 'intercityrail';
		case 'metro':
			return 'localrail';
		case 'other':
			return 'other';
	}

	//lets just pretend this will never happen
	return '';
}

export function process_realtime_vehicle_locations(
	chateau_id: string,
	category: string,
	response_from_birch_vehicles: any,
	map: maplibregl.Map
) {
	//console.log('process realtime data', chateau_id, category);

	realtime_vehicle_locations_store.update((realtime_vehicle_locations) => {
		if (realtime_vehicle_locations[category] === undefined) {
			realtime_vehicle_locations[category] = {};
		}

		if (realtime_vehicle_locations[category][chateau_id] === undefined) {
			realtime_vehicle_locations[category][chateau_id] = {};
		}

		realtime_vehicle_locations[category][chateau_id] =
			response_from_birch_vehicles.vehicle_positions;

		return realtime_vehicle_locations;
	});

	realtime_vehicle_route_cache_store.update((realtime_vehicle_route_cache) => {
		if (realtime_vehicle_route_cache[chateau_id] === undefined) {
			realtime_vehicle_route_cache[chateau_id] = {};
		}

		if (response_from_birch_vehicles.vehicle_route_cache) {
			if (Object.keys(response_from_birch_vehicles.vehicle_route_cache).length != 0) {
				realtime_vehicle_route_cache[chateau_id][category] =
					response_from_birch_vehicles.vehicle_route_cache;
			}
		}

		return realtime_vehicle_route_cache;
	});

	realtime_vehicle_route_cache_hash_store.update((realtime_vehicle_route_cache_hash) => {
		if (realtime_vehicle_route_cache_hash[chateau_id] === undefined) {
			realtime_vehicle_route_cache_hash[chateau_id] = {};
		}

		realtime_vehicle_route_cache_hash[chateau_id][category] =
			response_from_birch_vehicles.hash_of_routes;

		return realtime_vehicle_route_cache_hash;
	});

	realtime_vehicle_locations_last_updated_store.update(
		(realtime_vehicle_locations_last_updated) => {
			if (realtime_vehicle_locations_last_updated[chateau_id] === undefined) {
				realtime_vehicle_locations_last_updated[chateau_id] = {};
			}

			realtime_vehicle_locations_last_updated[chateau_id][category] =
				response_from_birch_vehicles.last_updated_time_ms;

			return realtime_vehicle_locations_last_updated;
		}
	);

	rerender_category_live_dots(category, map);
}

export function rerender_category_live_dots(category: string, map: maplibregl.Map) {
	const darkMode = determineDarkModeToBool();
	const realtime_vehicle_locations = get(realtime_vehicle_locations_store);
	const realtime_vehicle_route_cache = get(realtime_vehicle_route_cache_store);
	const usunits = get(usunits_store);
	//console.log( category, 'data contains', realtime_vehicle_locations[category]);

	const source_name: string = category_name_to_source_name(category);

	const source = map.getSource(source_name);

	const features = Object.entries(realtime_vehicle_locations[category])
		.map(([chateau_id, chateau_vehicles_list]) =>
			Object.entries(chateau_vehicles_list)
				.filter(([rt_id, vehicle_data]) => vehicle_data.position != null)
				.map(([rt_id, vehicle_data]) => {
					const vehiclelabel = vehicle_data.vehicle?.label || vehicle_data.vehicle?.id || '';
					let colour = '#aaaaaa';
					let text_colour: string = '#000000';

					let tripIdLabel = '';
					let trip_short_name = null;
					let headsign = '';

					if (vehicle_data.trip) {
						if (vehicle_data.trip.trip_short_name) {
							tripIdLabel = vehicle_data.trip.trip_short_name;

							trip_short_name = vehicle_data.trip.trip_short_name;
						} else {
							//	tripIdLabel = vehicle_data.trip.trip_id;

							if (chateau_id == 'metra') {
								const split = vehicle_data.trip.trip_id.split('_');

								if (split[1] != undefined) {
									tripIdLabel = split[1].replace(/\D/g, '');
								}
							}
						}

						if (vehicle_data.trip.trip_headsign) {
							headsign = vehicle_data.trip.trip_headsign;

							//if headsign is all caps, use title case
							if (headsign === headsign.toUpperCase()) {
								headsign = titleCase(headsign);
							}
						}
					}

					const routeId = vehicle_data.trip?.route_id;
					let maptag = '';

					let route_short_name = null;
					let route_long_name = null;

					const chateau_route_cache = realtime_vehicle_route_cache[chateau_id][category];

					if (chateau_route_cache) {
						if (routeId) {
							const route = chateau_route_cache[routeId];

							if (route) {
								route_long_name = route.route_long_name;
								route_short_name = route.route_short_name;

								if (route.route_short_name != '' && route.route_short_name != null) {
									maptag = route.route_short_name;
								} else {
									maptag = route.route_long_name;
								}
								colour = route.route_colour;
								text_colour = route.route_text_colour;
							} else {
								console.log(
									'Could not find route for ',
									chateau_id,
									category,
									routeId,
									realtime_vehicle_route_cache[chateau_id][category]
								);
							}
							text_colour;
							switch (maptag) {
								case '':
									break;
								case 'Metro E Line':
									maptag = 'E';
									break;
								case 'Metro A Line':
									maptag = 'A';
									break;
								case 'Metro B Line':
									maptag = 'B';
									break;
								case 'Metro C Line':
									maptag = 'C';

									break;
								case 'Metro D Line':
									maptag = 'D';

									break;
								case 'Metro L Line':
									maptag = 'L';

									break;
								case 'Metro K Line':
									maptag = 'K';

									break;
								case 'Metrolink Ventura County Line':
									maptag = 'Ventura';

									break;
								case 'Metrolink Antelope Valley Line':
									maptag = 'Antelope';

									break;
								case 'Metrolink San Bernardino Line':
									maptag = 'SB';

									break;
								case 'Metrolink Riverside Line':
									maptag = 'Riverside';

									break;
								case 'Metrolink Orange County Line':
									maptag = 'Orange';

									break;
								case 'Metrolink 91/Perris Valley Line':
									maptag = '91/Perris';

									break;
								case 'Metrolink Inland Empire-Orange County Line':
									maptag = 'IE-OC';

									break;
								default:
									break;
							}
						}
					}

					let contrastdarkmode = colour;
					let contrastdarkmodebearing = colour;

					let contrastlightmode = colour;

					if (colour && darkMode === false) {
						let rgb = hexToRgb(colour);

						//let hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

						const gamma = calculateGamma(rgb.r, rgb.g, rgb.b);

						if (gamma > (0.55)) {
							let [r, g, b] = adjustGamma([rgb.r, rgb.g, rgb.b], 0.55);

							rgb = { r, g, b };
						}

						contrastlightmode = `#${componentToHex(rgb.r)}${componentToHex(
							rgb.g
						)}${componentToHex(rgb.b)}`;
					//	console.log("darkened from ", colour, "to", contrastlightmode);
					}

					if (colour && darkMode === true) {
						//convert hex colour to array of 3 numbers

						const rgb = hexToRgb(colour);

						// console.log('rgb', rgb)

						if (rgb != null) {
							const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

							// console.log('hsl', hsl)

							const newdarkhsl = hsl;

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
							const newdarkrgb = hslToRgb(newdarkhsl.h, newdarkhsl.s, newdarkhsl.l);

							const newdarkbearingline = hslToRgb(
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

					let speedstr = '';

					if (typeof vehicle_data.position.speed == 'number') {
						if (usunits == true) {
							speedstr = `${(vehicle_data.position.speed * 2.23694).toFixed(1)} mph`;
						} else {
							speedstr = `${(vehicle_data.position.speed * 3.6).toFixed(1)} km/h`;
						}
					}

					return {
						type: 'Feature',
						properties: {
							//shown to user directly?
							vehicleIdLabel: vehiclelabel,
							speed: speedstr,
							color: colour,
							chateau: chateau_id,
							//int representing enum
							routeType: vehicle_data.route_type,
							//keep to gtfs lookup
							tripIdLabel: tripIdLabel,
							//keep to degrees as gtfs specs
							bearing: vehicle_data?.position?.bearing,
							has_bearing: vehicle_data?.position?.bearing != null,
							maptag: fixRouteName(chateau_id, maptag, routeId)
								.replace(' Branch', '')
								.replace(' Line', '')
								.replace('Counterclockwise', 'ACW')
								.replace('Clockwise', 'CW'),
							trip_short_name: trip_short_name,
							route_short_name: route_short_name,
							route_long_name: route_long_name,
							contrastdarkmode: contrastdarkmode,
							contrastdarkmodebearing,
							contrastlightmode: contrastlightmode,
							routeId: routeId,
							headsign: fixHeadsignText(headsign, maptag)
								.replace('Counterclockwise', 'ACW')
								.replace('Clockwise', 'CW'),
							timestamp: vehicle_data.timestamp,
							id: rt_id,
							text_color: text_colour,
							trip_id: vehicle_data.trip?.trip_id,
							start_time: vehicle_data.trip?.start_time,
							start_date: vehicle_data.trip?.start_date
						},
						geometry: {
							type: 'Point',
							coordinates: [vehicle_data.position.longitude, vehicle_data.position.latitude]
						}
					};
				})
		)
		.flat();

	//console.log('rerendering', category, 'with', features);

	source.setData({
		type: 'FeatureCollection',
		features: features
	});

	if (category == 'bus') {
		const tokki_source = map.getSource('tokkibussource');

		if (tokki_source) {
			const tokki_features = [...features]
				.filter((x) => x.properties.chateau && typeof x.properties.vehicleIdLabel == 'string')
				.filter((x) => {
					if (new_jeans_buses[x.properties.chateau]) {
						if (new_jeans_buses[x.properties.chateau].has(x.properties.vehicleIdLabel)) {
							return true;
						}
					}
					return false;
				});

			tokki_source.setData({
				type: 'FeatureCollection',
				features: tokki_features
			});
		}

		const rainbowbussource = map.getSource('rainbowbussource');

		if (rainbowbussource) {
			const rainbowbus_features = [...features]
				.filter((x) => x.properties.chateau && typeof x.properties.vehicleIdLabel == 'string')
				.filter((x) => {
					if (pride_buses[x.properties.chateau]) {
						if (pride_buses[x.properties.chateau].has(x.properties.vehicleIdLabel)) {
							return true;
						}
					}

					return false;
				});

			rainbowbussource.setData({
				type: 'FeatureCollection',
				features: rainbowbus_features
			});
		}
	}

	if (category == 'metro') {
		const rainbow_source = map.getSource('rainbowtrainsource');

		if (rainbow_source) {
			const rainbow_features = [...features]
				.filter((x) => x.properties.chateau && typeof x.properties.vehicleIdLabel == 'string')
				.filter(
					(x) =>
						x.properties.chateau == 'metro~losangeles' &&
						x.properties.vehicleIdLabel.contains('1162')
				);

			rainbow_source.setData({
				type: 'FeatureCollection',
				features: rainbow_features
			});

			console.log('rainbow source set', rainbow_features);
		} else {
			console.log('no rainbow source');
		}
	}
}
