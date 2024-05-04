import mapboxgl from 'mapbox-gl';
import type { Writable } from 'svelte/store';
import { writable, get } from 'svelte/store';
import {
    data_stack_store,
    on_sidebar_trigger_store
} from "../globalstores";
import {
    MapSelectionScreen,
    StackInterface,
    MapSelectionOption,
    SingleTrip,
    VehicleMapSelector,
    RouteStack,
    StopStack,
    RouteMapSelector
} from './stackenum';

export function setup_click_handler(map:mapboxgl.Map, layerspercategory:Record<string, any>, setSidebarOpen: () => void) {
    map.on('click', (e) => {
        console.log('clicked on ', e);

        const click_bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
            [e.point.x - 3, e.point.y - 3],
            [e.point.x + 3, e.point.y + 3]
        ];

        try {
            const selectedFeatures = map.queryRenderedFeatures(click_bbox, {
                layers: Object.values(layerspercategory)
                    .map((x) => Object.values(x))
                    .flat()
            });

            console.log('selectedFeatures', selectedFeatures);

            const selected_vehicles_raw = selectedFeatures.filter(
                (x: Record<string, any>) =>
                    x.source === 'buses' ||
                    x.source === 'localrail' ||
                    x.source === 'intercityrail' ||
                    x.source === 'other'
            );

            const selected_vehicles_key_unique = new Set();

            const selected_vehicles: MapSelectionOption[] = selected_vehicles_raw
                .map((x: any) => {
                    let key = x.properties.vehicleIdLabel + x.properties.chateau;

                    if (selected_vehicles_key_unique.has(key)) {
                        return null;
                    }

                    selected_vehicles_key_unique.add(key);

                    return new MapSelectionOption(
                        new VehicleMapSelector(
                            x.properties.chateau,
                            x.properties.vehicleIdLabel,
                            x.properties.routeId,
                            x.properties.headsign,
                            x.properties.tripIdLabel,
                            x.properties.color,
                            x.properties.route_short_name,
                            x.properties.route_long_name,
                            x.properties.routeType,
                            x.properties.trip_short_name
                        )
                    );
                })
                .filter((x: MapSelectionOption | null) => x != null);

            const selected_routes_raw = selectedFeatures.filter(
                (x: any) => x.source === 'busshapes' || x.source === 'notbusshapes'
            );

            const selected_routes_key_unique = new Set();

            const selected_routes = selected_routes_raw
                .map((x: any) => {
                    const key = x.properties.chateau + x.properties.route_label;

                    if (selected_routes_key_unique.has(key)) {
                        return null;
                    }

                    if (x.properties) {
                        if (x.properties.routes) {
                            if (!x.properties.routes.replace('{', '').replace('}', '')) {
                                return null;
                            }

                            selected_routes_key_unique.add(key);

                            return new MapSelectionOption(
                                new RouteMapSelector(
                                    x.properties.chateau,
                                    x.properties.routes.replace('{', '').replace('}', '').split(',')[0],
                                    `#${x.properties.color}`,
                                    x.properties.route_label
                                )
                            );
                        }
                    }

                    return null;
                })
                .filter((x: MapSelectionOption | null) => x != null);

            console.log('selected shapes', selected_routes_raw);

            let MapSelectionOptions = new Array<MapSelectionOption>();

            MapSelectionOptions = MapSelectionOptions.concat(selected_vehicles);
            MapSelectionOptions = MapSelectionOptions.concat(selected_routes);

            if (MapSelectionOptions.length > 0) {
            
                const data_stack = get(data_stack_store);

                data_stack.push(new StackInterface(new MapSelectionScreen(MapSelectionOptions)));


                data_stack_store.update((data_stack_pointer) => 
                   data_stack
                );

                if (data_stack.length > 25) {
                    //only use latest 25 entries
                    ;
                    data_stack_store.update((data_stack_pointer) => 
                        data_stack_pointer.slice(data_stack.length - 25)
                     );
                }

                console.log('data stack now', get(data_stack_store));
                on_sidebar_trigger_store.update(
                    (x) => x + 1
                )

                setSidebarOpen();
            }
        } catch (e) {
            console.error(e);
        }
    });
}