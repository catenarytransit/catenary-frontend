import {
    ui_theme_store,
    data_stack_store,
    on_sidebar_trigger_store,
    realtime_vehicle_locations_last_updated_store,
    realtime_vehicle_locations_store,
    realtime_vehicle_route_cache_hash_store,
    realtime_vehicle_route_cache_store,
    lock_on_gps_store,
    usunits_store,
    show_zombie_buses_store,
    show_my_location_store,
    custom_icons_category_to_layer_id,
    map_pointer_store,
    geolocation_store,
    chateaus_store,
    show_gtfs_ids_store
} from '../globalstores';
import {changeContextTheme} from './addLayers/contextLayer';
import { add_image_pedestrian_pattern } from './pedestrian_layer';
import {get} from 'svelte/store';

export function refreshUIMaplibre() {


    let map = get(map_pointer_store);
    let darkMode = false;

    if (map) {
        
    add_image_pedestrian_pattern(map);

        if (get(ui_theme_store) == "system") {
            const checkIsDarkSchemePreferred = () => window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ?? false;

            darkMode = checkIsDarkSchemePreferred();
        }
        else if (get(ui_theme_store) == "dark") {
            darkMode = true;
        } else {
            darkMode = false;
        }

        //fetch the current style

        let style = map.getStyle();

        //fetch the current layers

        let layers = map.getStyle().layers;

        let url = darkMode ? "/dark-style.json" : "/light-style.json";

        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log("new style to set", data, layers);

                let new_layers_into_obj = {};

                for (let i = 0; i < data.layers.length; i++) {
                    new_layers_into_obj[data.layers[i].id] = data.layers[i];
                }

                for (let i = 0; i < layers.length; i++) {
                    let layer = layers[i];

                    if (new_layers_into_obj[layer.id]) {
                        console.log("found layer", layer.id);
                        
                        if (new_layers_into_obj[layer.id].paint == undefined) {
                            new_layers_into_obj[layer.id].paint = {};
                        }

                        if (new_layers_into_obj[layer.id].layout == undefined) {
                            new_layers_into_obj[layer.id].layout = {};
                        }

                        
                        //fetch the keys of the old layer

                        let paint_keys_of_new_layer = Object.keys(new_layers_into_obj[layer.id].paint);


                        //fetch the keys of the new layer

                        let layout_keys_of_new_layer = Object.keys(new_layers_into_obj[layer.id].layout);

                        //delete properties that are not in the new layer

                       
                        if (layer.layout) {
                            
                        let layout_keys_of_old_layer = Object.keys(layer.layout);
                            for (let i = 0; i < layout_keys_of_old_layer.length; i++) {
                                if (layout_keys_of_new_layer.indexOf(layout_keys_of_old_layer[i]) == -1) {
                                    map.setLayoutProperty(layer.id, layout_keys_of_old_layer[i], null);
                                }
                            }    
                        }

                        if (layer.paint) {
                            
                        let paint_keys_of_old_layer = Object.keys(layer.paint);
                        for (let i = 0; i < paint_keys_of_old_layer.length; i++) {
                            if (paint_keys_of_new_layer.indexOf(paint_keys_of_old_layer[i]) == -1) {
                                map.setPaintProperty(layer.id, paint_keys_of_old_layer[i], null);
                            }
                        }
                        }

                        //for each obj in paint and layout, apply the new values

                        for (let layout_key in new_layers_into_obj[layer.id].layout) {
                            map.setLayoutProperty(layer.id, layout_key, new_layers_into_obj[layer.id].layout[layout_key]);
                        }

                        for (let paint_key in new_layers_into_obj[layer.id].paint) {
                            map.setPaintProperty(layer.id, paint_key, new_layers_into_obj[layer.id].paint[paint_key]);
                        }

                        if (layer.id == "pedestrian_area_pattern") {
                            if (darkMode == false) {
                                map.setPaintProperty("pedestrian_area_pattern", "fill-pattern", "pattern-ped");
                            } else {
                                map.setPaintProperty("pedestrian_area_pattern", "fill-pattern", null);
                            }
                        }

                    }
                }
            });

            changeContextTheme(map, darkMode);
    }
}