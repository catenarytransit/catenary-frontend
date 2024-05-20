import type { Map } from "mapbox-gl";

export const new_jeans_buses:Record<string, Set<string>> = {
    "orangecountytransportationauthority": new Set(["5855"]),
    "metro~losangeles": new Set(["5832"])
}

export function make_custom_icon_source(map: Map) {
    map.addSource("tokkibussource", {
        type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
    });
}

export function add_bunny_layer(map: Map, layerspercategory: any) {
    map.loadImage('/icons/rabbit_samsung.png', (error, image) => {
		if (image) {
			
			map.addImage('tokki', image);

            map.addLayer({
                id:  "tokkibuses",
                source: 'tokkibussource',
                //filter: ['==', "type", "tokki"],
                type: 'symbol',
                paint: {
                    'icon-opacity': [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        7,
                        0.8,
                        10,
                        0.9
                      ],
                },
                layout: {
                    'icon-image': 'tokki',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    //'icon-rotate': ['get', 'bearing'],
                   //'icon-rotation-alignment': 'map',
                    'icon-size': [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        8,
                        0.15,
                        13,
                        0.25,
                        16,
                        0.4
                      ]
                },
                minzoom: 8
            }, layerspercategory.bus.livedots);
		}});
}