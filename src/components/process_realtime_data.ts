import { componentToHex } from '../geoMathsAssist';
import { titleCase } from '../utils/titleCase';
import { writable, get } from 'svelte/store';
import {
	realtime_vehicle_locations_store,
	realtime_vehicle_route_cache_store,
	realtime_vehicle_route_cache_hash_store,
	route_cache,
	route_cache_agencies_known,
	realtime_vehicle_locations_last_updated_store,
	usunits_store,
	previous_tile_boundaries_store,
	realtime_vehicle_locations_storev2
} from '../globalstores';
import {
	add_bunny_layer,
	make_custom_icon_source,
	new_jeans_buses,
	pride_buses
} from './addLayers/customIcons';
import maplibregl from 'maplibre-gl';
import { lightenColour, darkenColour } from './lightenDarkColour';
import { hexToRgb, rgbToHsl, hslToRgb } from '../utils/colour';
import { calculateGamma } from './colour/computeBrightness';
import { fixHeadsignText, fixRouteName } from './agencyspecific';
import { adjustGamma } from './colour/readjustGamma';
import { determineDarkModeToBool } from './determineDarkModeToBool';
import { occupancy_to_symbol } from './occupancy_to_symbol';
import { _ } from 'svelte-i18n';

interface ChateauCategoryData {
	vehicle_positions?: Record<number, Record<number, Record<string, any>>>;
	replaces_all?: boolean;
	last_updated_time_ms?: number;
	list_of_agency_ids?: string[];
}

interface ChateauData {
	categories?: Record<string, ChateauCategoryData>;
}

interface BirchVehiclesResponse {
	chateaus: Record<string, ChateauData>;
}

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

function fetch_routes_of_chateau_by_agency(chateau_id: string, agency_id_list: string[]) {
	const agencies_known_for_chateau = get(route_cache_agencies_known)[chateau_id] || [];

	const agencies_to_fetch = agency_id_list.filter(
		(agency_id) => !agencies_known_for_chateau.includes(agency_id)
	);

	var agencies_submit_list = agencies_to_fetch;

	if (agencies_to_fetch.length === 0) {
		agencies_submit_list = null;
	}

	const myHeaders = new Headers();
	myHeaders.append('Content-Type', 'application/json');

	const raw = JSON.stringify({
		agency_filter: agencies_submit_list
	});

	const requestOptions = {
		method: 'POST',
		headers: myHeaders,
		body: raw,
		redirect: 'follow'
	};

	fetch(
		`https://birch_routesfetch.catenarymaps.org/getroutesofchateauwithagency/${chateau_id}`,
		requestOptions
	)
		.then((response) => response.json())
		.then((new_routes: any[]) => {
			route_cache.update((cache) => {
				if (!cache[chateau_id]) cache[chateau_id] = {};
				new_routes.forEach((route) => (cache[chateau_id][route.route_id] = route));
				return cache;
			});
			route_cache_agencies_known.update((known) => {
				if (!known[chateau_id]) known[chateau_id] = [];
				known[chateau_id].push(...agencies_to_fetch);
				return known;
			});
		})
		.catch((error) => console.log('error fetching routes', error));
}

export function process_realtime_vehicle_locations_v2(
	response_from_birch_vehicles_2: BirchVehiclesResponse,
	map: maplibregl.Map,
	bounds: Record<string, any>
) {
	let rerender_category: Set<string> = new Set();

	let route_cache_current = get(route_cache);

	realtime_vehicle_locations_storev2.update((realtime_vehicle_locations) => {
		Object.entries(response_from_birch_vehicles_2.chateaus).forEach(
			([chateau_id, chateau_data]) => {
				//console.log('chateau', chateau_id, chateau_data);

				let list_of_agency_ids_to_fetch = [];
				let should_fetch_routes = false;

				if (chateau_data.categories) {
					Object.entries(chateau_data.categories).forEach(([category, category_data]) => {
						if (category_data != null) {
							let bounds_last_fetched_for_this_category = bounds[`level${category_data.z_level}`];

							previous_tile_boundaries_store.update((previous_tile_boundaries) => {
								if (!previous_tile_boundaries[chateau_id]) {
									previous_tile_boundaries[chateau_id] = {};
								}

								previous_tile_boundaries[chateau_id][category] =
									bounds_last_fetched_for_this_category;

								return previous_tile_boundaries;
							});

							if (!realtime_vehicle_locations[category]) {
								realtime_vehicle_locations[category] = {};
							}

							if (category_data.vehicle_positions) {
								//console.log('agency list', chateau_id, category_data.list_of_agency_ids);
								if (category_data.replaces_all == true) {
									realtime_vehicle_locations[category][chateau_id] =
										category_data.vehicle_positions;

									Object.values(category_data.vehicle_positions).forEach((data_for_x) => {
										Object.values(data_for_x).forEach((data_for_xy) => {
											Object.values(data_for_xy).forEach((vehicle_data) => {
												let route_id = vehicle_data.trip?.route_id;

												if (route_id) {
													if (route_cache_current[chateau_id] == undefined) {
														should_fetch_routes = true;
													} else {
														if (route_cache_current[chateau_id][route_id] == undefined) {
															should_fetch_routes = true;
														}
													}
												}
											});
										});
									});

									// console.log('set all as ', realtime_vehicle_locations[category][chateau_id])
								} else {
									//category_data.vehicle_positions is an x, y structure Record<number, Record<number, Record<string, any>>>
									Object.entries(category_data.vehicle_positions).forEach(([x, data_for_x]) => {
										Object.entries(data_for_x).forEach(([y, data_for_xy]) => {
											if (realtime_vehicle_locations[category][chateau_id][x] == undefined) {
												realtime_vehicle_locations[category][chateau_id][x] = {};
											}

											realtime_vehicle_locations[category][chateau_id][x][y] = data_for_xy;

											Object.entries(data_for_xy).forEach(([rt_id, vehicle_data]) => {
												let route_id = vehicle_data.trip?.route_id;

												if (route_id) {
													if (route_cache_current[chateau_id] == undefined) {
														should_fetch_routes = true;
													} else {
														if (route_cache_current[chateau_id][route_id] == undefined) {
															should_fetch_routes = true;
														}
													}
												}
											});

											if (category_data.list_of_agency_ids) {
												category_data.list_of_agency_ids.forEach((agency_id) => {
													list_of_agency_ids_to_fetch.push(agency_id);
												});
											}
											//console.log('set data for', chateau_id, category, x, y, data_for_xy)
										});
									});
								}

								rerender_category.add(category);
							}
						} else {
							//console.log('no category data for', category, chateau_id);
						}
					});
				}

				if (should_fetch_routes) {
					//console.log('should fetch routes')
					fetch_routes_of_chateau_by_agency(
						chateau_id,
						list_of_agency_ids_to_fetch.filter((v, i, a) => a.indexOf(v) === i)
					);
				}
			}
		);

		return realtime_vehicle_locations;
	});

	realtime_vehicle_locations_last_updated_store.update(
		(realtime_vehicle_locations_last_updated) => {
			Object.entries(response_from_birch_vehicles_2.chateaus).forEach(
				([chateau_id, chateau_data]) => {
					//console.log('chateau', chateau_id, chateau_data);

					if (chateau_data.categories) {
						Object.entries(chateau_data.categories).forEach(([category, category_data]) => {
							if (category_data != null) {
								if (!realtime_vehicle_locations_last_updated[chateau_id]) {
									realtime_vehicle_locations_last_updated[chateau_id] = {};
								}

								realtime_vehicle_locations_last_updated[chateau_id][category] =
									category_data.last_updated_time_ms;
							} else {
								//console.log('no category data for', category, chateau_id);
							}
						});
					}
				}
			);

			return realtime_vehicle_locations_last_updated;
		}
	);

	//console.log('rerendering', rerender_category);

	rerender_category.forEach((category) => {
		rerender_category_live_dots(category, map);
	});
}

export function rerender_category_live_dots(category: string, map: maplibregl.Map) {
	const darkMode = determineDarkModeToBool();
	const realtime_vehicle_locations = get(realtime_vehicle_locations_storev2);
	const route_cache_data = get(route_cache);
	const usunits = get(usunits_store);
	//console.log( category, 'data contains', realtime_vehicle_locations[category]);

	const source_name: string = category_name_to_source_name(category);

	const source = map.getSource(source_name) as maplibregl.GeoJSONSource;

	//console.log(Object.entries(realtime_vehicle_locations[category]))

	const features = Object.entries(realtime_vehicle_locations[category])
		.map(([chateau_id, grid_data]) => {
			let chateau_vehicles_list: Record<string, any> = {};

			if (grid_data) {
				Object.values(grid_data).forEach((y_data) => {
					if (y_data) {
						Object.values(y_data).forEach((vehicles) => {
							if (vehicles) {
								Object.assign(chateau_vehicles_list, vehicles);
							}
						});
					}
				});
			}

			//console.log("chateau_vehicles_list", chateau_vehicles_list)

			return Object.entries(chateau_vehicles_list)
				.filter(([rt_id, vehicle_data]) => vehicle_data.position != null)
				.filter(([rt_id, vehicle_data]) => {
					if (
						vehicle_data.position.latitude == 34.099503 &&
						vehicle_data.position.longitude == -117.29602
					) {
						return false;
					}
					if (
						vehicle_data.position.latitude == 34.250793 &&
						vehicle_data.position.longitude == -119.205025
					) {
						return false;
					}
					if (
						vehicle_data.position.latitude == 34.05573 &&
						vehicle_data.position.longitude == -118.23351
					) {
						return false;
					} else {
						return true;
					}
				})
				.map(([rt_id, vehicle_data]) => {
					//	console.log('vehicle data', vehicle_data)

					let vehiclelabel = vehicle_data.vehicle?.label || vehicle_data.vehicle?.id || '';

					if (chateau_id == 'new-south-wales') {
						if (vehiclelabel.includes(' to ')) {
							vehiclelabel = vehicle_data.vehicle?.id || '';
						}
					}

					let colour = '#aaaaaa';
					let text_colour: string = '#000000';

					let tripIdLabel = '';
					let trip_short_name = null;
					let headsign = '';

					vehiclelabel = vehiclelabel.replace('ineo-tram:', '').replace('ineo-bus:', '');

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

							if (chateau_id == 'new-south-wales') {
								headsign = headsign.replace(' Station', '');
							}
						}
					}

					if (headsign.includes('Line  - ') && chateau_id == 'metro~losangeles') {
						headsign = headsign.split('-')[1].trim();
					}

					const routeId = vehicle_data.trip?.route_id;
					let maptag = '';

					let route_short_name = null;
					let route_long_name = null;

					const chateau_route_cache = route_cache_data[chateau_id];

					if (chateau_route_cache) {
						if (routeId && chateau_route_cache) {
							const route = chateau_route_cache[routeId];

							//console.log('route', route)

							if (route) {
								route_long_name = route.long_name;
								route_short_name = route.short_name;

								if (route.short_name != '' && route.short_name != null) {
									maptag = route.short_name;
								} else {
									maptag = route.long_name;
								}

								colour = route.color;
								text_colour = route.text_color;
							} else {
								/*console.log(
									'Could not find route for ',
									chateau_id,
									category,
									routeId
								);
								*/
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

						if (gamma > 0.55) {
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

							if (hsl.l < 60) {
								hsl.l = Math.min(Math.sqrt(hsl.l * 25) + 40, 100);
								hsl.s = Math.min(100, hsl.s + 20);
							}
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
							speedstr = `${(vehicle_data.position.speed * 2.23694).toFixed(1)} ᵐᵖʰ`;
						} else {
							speedstr = `${(vehicle_data.position.speed * 3.6).toFixed(1)} ㎞/ʰ`;
						}
					}

					let crowd_symbol = occupancy_to_symbol(vehicle_data.occupancy_status);

					let delay_label = '';

					if (vehicle_data.trip) {
						if (vehicle_data.trip?.delay != undefined) {
							let prefix = '+';

							if (vehicle_data.trip?.delay < 0) {
								prefix = '-';
							}

							let abs = Math.abs(vehicle_data.trip.delay);

							let minutes = Math.floor(abs / 60);

							let hours = Math.floor(minutes / 60);
							minutes = minutes % 60;

							delay_label = `${prefix}${hours > 0 ? `${hours}h` : ``}${minutes}m`;
						}
					}

					return {
						type: 'Feature',
						properties: {
							//shown to user directly?
							vehicleIdLabel: vehiclelabel || '',
							speed: speedstr,
							color: colour,
							chateau: chateau_id,
							//int representing enum
							route_type: vehicle_data.route_type,
							//keep to gtfs lookup
							tripIdLabel: tripIdLabel,
							//keep to degrees as gtfs specs
							bearing: vehicle_data?.position?.bearing,
							has_bearing: vehicle_data?.position?.bearing != null,
							maptag: (fixRouteName(chateau_id, maptag, routeId) || '')
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
							headsign: (fixHeadsignText(headsign, maptag) || '')
								.replace('Counterclockwise', translate('anticlockwise_abbrievation'))
								.replace('Clockwise', translate('clockwise_abbrievation')),
							timestamp: vehicle_data.timestamp,
							id: rt_id,
							text_color: text_colour,
							trip_id: vehicle_data.trip?.trip_id,
							start_time: vehicle_data.trip?.start_time,
							start_date: vehicle_data.trip?.start_date,
							crowd_symbol: crowd_symbol,
							occupancy_status: vehicle_data.occupancy_status,
							delay_label: delay_label,
							delay: vehicle_data.trip?.delay
						},
						geometry: {
							type: 'Point',
							coordinates: [vehicle_data.position.longitude, vehicle_data.position.latitude]
						}
					};
				});
		})
		.flat();

	//	console.log('rerendering', category, 'with', features);

	if (source) {
		source.setData({
			type: 'FeatureCollection',
			features: features
		});
	} else {
		console.error('no source for', source_name);
	}
}

function translate(key: string, options?: Record<string, any>): string {
	return get(_)(key, options);
}
