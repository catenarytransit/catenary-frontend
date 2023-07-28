<script lang="ts">
    
	import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

    fetch(
						`https://api.octa.net/GTFSRealTime/protoBuf/VehiclePositions.aspx`,
                        {
                           
  headers: {
    'Access-Control-Allow-Origin':'*'
  }
                        }
					)
						.then(async (response) => {
							return await response.arrayBuffer();
						})
						.then((buffer) => {
							const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
								new Uint8Array(buffer)
							);

							//console.log('feed', feed);

					
								//console.log('entity', entity);

								//console.log('has trip', vehicle.trip);

                                console.log('vehicles', feed);
							

							
						})
						.catch((e) => {
							console.error(e);
						});

                        fetch(
						`https://api.octa.net/GTFSRealTime/protoBuf/servicealerts.aspx`,
                        
                        {
                          
  headers: {
    'Access-Control-Allow-Origin':'*'
  }
                        }
					)
						.then(async (response) => {
							return await response.arrayBuffer();
						})
						.then((buffer) => {
							const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
								new Uint8Array(buffer)
							);

							//console.log('feed', feed);

						

                                console.log('alerts', feed);
							

							
						})
						.catch((e) => {
							console.error(e);
						});

                        fetch(
						`https://api.octa.net/GTFSRealTime/protoBuf/tripupdates.aspx`,
                        {
                          
  headers: {
    'Access-Control-Allow-Origin':'*'
  }
                        }
					)
						.then(async (response) => {
							return await response.arrayBuffer();
						})
						.then((buffer) => {
							const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
								new Uint8Array(buffer)
							);

							//console.log('feed', feed);

						

                                console.log('trips', feed);
							

							
						})
						.catch((e) => {
							console.error(e);
						});
</script>

