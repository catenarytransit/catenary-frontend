import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

import { show_my_location_store, geolocation_store, map_pointer_store } from '../../globalstores';

interface SearchQueryResponse {
    stops_section: StopsSection
}

interface StopsSection {
    stops: Record<string, Record<string, any>>,
    routes: Record<string, Record<string, any>>,
    ranking: Array<StopsRanking>
}

interface StopsRanking {
    gtfs_id: string,
    score: number,
    chateau: string,
}

export const data_store_text_queries: Writable<Record<string, SearchQueryResponse>> = writable({});

export const latest_query_data: Writable<SearchQueryResponse | null> = writable(null);

let geolocation: GeolocationPosition | null;

geolocation_store.subscribe((g) => {
	geolocation = g;
});

export function new_query(text: string) {
    fetch(`https://birch.catenarymaps.org/text_search_v1?text=${text}&user_lat=${geolocation?.coords?.latitude}&user_lon=${geolocation.coords.longitude}`)
        .then(response => response.json())
        .then((data) => {
            data_store_text_queries.update((existing_map) => {
                existing_map[text] = data;
                return existing_map;
            });
            latest_query_data.set(data);
        });
}