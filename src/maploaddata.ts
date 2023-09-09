export function determineFeeds(map:any, staticfeeds:any, operators:any, realtimefeeds:any,geolocation:GeolocationPosition) {
    //returns an array of keys for each of the 3 arrays

    //start by calculating the list of static feeds in frame

    
	const features = map.queryRenderedFeatures({ layers: ['static_feed_calc'] });

    //console.log('statics_in_frame', features);

    console.log('features static data', features)

    console.log('first feature', features[0].properties.name)

    const statics_in_frame = features.map((f:any) => f.properties.name);
    
    const static_data = statics_in_frame.map((s:string[]) => staticfeeds.find((origin:any) => s === origin.onestop_feed_id)).filter((x) => x != undefined);

   console.log('static data',static_data)

    //now calculate the list of operators in frame

    const operators_in_frame = static_data.map((f:any) => f.operators).flat().filter((x:any) => x != undefined);

    //now calculate the list of realtime feeds in frame

    console.log('operators_in_frame',operators_in_frame)

    const operators_data = operators_in_frame.map((o:any) => 
    operators.find((op:any) => op.onestop_operator_id === o
    )).filter((x) => x != undefined);

    console.log('operators_data',operators_data)

    const realtime_feeds_in_frame = operators_data.map((o:any) => o.gtfs_realtime_feeds).flat();

    return {
        s: statics_in_frame,
        o: operators_in_frame,
        r: realtime_feeds_in_frame
    }
}