export function determineFeedsUsingChateaus(map: any) {
	const features = map.queryRenderedFeatures({ layers: ['chateaus_calc'] });

	//console.log('chateaus in frame', features);

	const realtime_feeds = new Set<string>();
	const schedule_feeds = new Set<string>();
	const chateaus = new Set<string>();

	features.forEach((feature: any) => {
		chateaus.add(feature.properties.chateau);
		const this_realtime_feeds_list: string[] = JSON.parse(feature.properties.realtime_feeds);
		const this_schedule_feeds_list: string[] = JSON.parse(feature.properties.schedule_feeds);

		this_realtime_feeds_list.forEach((realtime) => realtime_feeds.add(realtime));
		this_schedule_feeds_list.forEach((sched) => schedule_feeds.add(sched));
	});

	//console.log("realtime feeds list: ", realtime_feeds);

	return {
		realtime_feeds,
		schedule_feeds,
		chateaus
	};
}
