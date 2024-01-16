export function determineFeeds(
	map: any,
	staticfeeds: any,
	operators: any,
	realtimefeeds: any,
	geolocation: GeolocationPosition
) {
	// returns an array of keys for each of the 3 arrays

	// start by calculating the list of static feeds in frame
	// console.log('geolocation', geolocation);
	const features = map.queryRenderedFeatures({ layers: ['static_hull_calc'] });

	// console.log('statics_in_frame', features);

	// console.log('features static data', features)

	//  console.log('first feature', features[0].properties.name)

	const statics_in_frame = [...new Set(features.map((f: any) => f.properties.onestop_feed_id))];

	const static_data = statics_in_frame
		.map((s: string[]) => staticfeeds.find((origin: any) => s === origin.onestop_feed_id))
		.filter((x) => x != undefined);

	//  console.log('static data',static_data)

	//now calculate the list of operators in frame

	const operators_in_frame = [
		...new Set(
			static_data
				.map((f: any) => f.operators)
				.flat()
				.filter((x: any) => x != undefined)
		)
	];

	//now calculate the list of realtime feeds in frame

	// console.log('operators_in_frame',operators_in_frame)

	const operators_data = operators_in_frame
		.map((o: any) => operators.find((op: any) => op.onestop_operator_id === o))
		.filter((x) => x != undefined);

	// console.log('operators_data',operators_data)

	const realtime_feeds_in_frame = [...new Set(operators_data.map((o: any) => o.gtfs_realtime_feeds).flat())];

	if (operators_data.find((o) => o.onestop_operator_id == 'o-9-amtrak')) {
		realtime_feeds_in_frame.push('f-amtrak~rt');
	}
	//console.log('realtime_feeds_in_frame',realtime_feeds_in_frame)

	const static_data_obj: any = {};

	static_data.forEach((x: any) => {
		static_data_obj[x.onestop_feed_id] = x;
	});

	const operators_data_obj: any = {};

	operators_data.forEach((x: any) => {
		operators_data_obj[x.onestop_operator_id] = x;
	});

	const realtime_feeds_data_obj: any = {};

	// console.log('realtime_feeds_in_frame',realtime_feeds_in_frame)

	const realtime_data = realtime_feeds_in_frame
		.map((r: any) => realtimefeeds.find((rf: any) => r === rf.onestop_feed_id))
		.filter((x) => x != undefined);

	realtime_data.forEach((x: any) => {
		realtime_feeds_data_obj[x.onestop_feed_id] = x;
	});

	// console.log('realtime_data',realtime_data);

	//console.log('init data realtime', realtimefeeds)

	Object.values(operators_data_obj).forEach((eachoperator: any) => {
		//console.log('eachoperator',eachoperator)

		eachoperator.gtfs_realtime_feeds.forEach((eachrealtimefeedid: any) => {
			if (realtime_feeds_data_obj[eachrealtimefeedid] === undefined) {
				realtime_feeds_data_obj[eachrealtimefeedid] = {
					onestop_feed_id: eachrealtimefeedid,
					operators: [],
					operators_to_gtfs_ids: {}
				};
			}

			realtime_feeds_data_obj[eachrealtimefeedid].operators.push(eachoperator.onestop_operator_id);

			realtime_feeds_data_obj[eachrealtimefeedid].operators_to_gtfs_ids[eachoperator.onestop_operator_id] =
				eachoperator.realtime_onestop_feeds_to_gtfs_ids[eachrealtimefeedid];
		});
	});

	// console.log('statics_data', static_data_obj)
	// console.log('operators_in_frame', operators_data_obj)

	return {
		s: statics_in_frame,
		o: operators_in_frame,
		r: realtime_feeds_in_frame,
		static_data_obj: static_data_obj,
		realtime_feeds_data_obj,
		operators_data_obj
	};
}
