<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import HomeButton from './SidebarParts/home_button.svelte';
	import polyline from '@mapbox/polyline';
	import { writable, get } from 'svelte/store';
	import { timezone_to_locale } from './timezone_to_locale';
	import {
		data_stack_store,
		on_sidebar_trigger_store,
		realtime_vehicle_locations_last_updated_store,
		realtime_vehicle_locations_store,
		realtime_vehicle_route_cache_hash_store,
		realtime_vehicle_route_cache_store,
		lock_on_gps_store,
		show_seconds_store,
		usunits_store,
		show_zombie_buses_store,
		show_my_location_store,
		custom_icons_category_to_layer_id,
		map_pointer_store,
		show_gtfs_ids_store,
		ui_theme_store,
		stops_to_hide_store
	} from '../globalstores';
	export let chateau: string;
	export let stop_id: string;
	import TimeDiff from './TimeDiff.svelte';
	import DelayDiff from './DelayDiff.svelte';
	import { locale, _ } from 'svelte-i18n';
	import Clock from './Clock.svelte';
	import StopScreenRow from './StopScreenRow.svelte';
	import { SingleTrip, StackInterface } from './stackenum';

	// ---------- Paging controls ----------
	const OVERLAP_SECONDS = 5 * 60; // small overlap to help dedupe across pages
	const PAGE_REFRESH_MS = 10000; // refresh each page every 10s
	const THRESHOLD_HIGH = 150; // many results → use 2h
	const THRESHOLD_LOW = 40; // sparse → use up to 24h

	// We page forward in time from now. If user toggles previous, we still keep
	// showing earlier items but we don't load older pages by default.
	let pages: Array<{
		id: string;
		startSec: number;
		endSec: number;
		refreshedAt: number;
		loading: boolean;
		error?: string;
	}> = [];

	// Event index with dedupe by newest page refresh
	type EventKey = string; // composed key
	let eventIndex: Map<EventKey, { event: any; pageId: string; refreshedAt: number }>; // merged
	let mergedEvents: any[] = [];

	let pageTimers: Map<string, any>; // intervals per page

	// dynamic page size in hours (auto-tunes based on density)
	let currentPageHours = 12; // default page size

	let show_seconds = get(show_seconds_store);
	let locale_inside_component = get(locale);
	show_seconds_store.subscribe((value) => (show_seconds = value));

	// UI state
	let dates_to_events_filtered: Record<string, any[]> = {};
	let current_time = 0;
	let fly_to_already = false;
	let data_meta: any = null; // primary/routes/shapes merged from any page
	let show_previous_departures = false;
	let previous_count = 0;

	function resetState() {
		// clear paging and data when stop changes
		pages = [];
		eventIndex = new Map();
		mergedEvents = [];
		pageTimers = new Map();
		dates_to_events_filtered = {};
		data_meta = null;
		fly_to_already = false;
		currentPageHours = 12;
	}

	function pageIdFor(startSec: number, endSec: number) {
		return `${startSec}-${endSec}`;
	}

	function buildUrl(startSec: number, endSec: number) {
		const base = 'https://birch.catenarymaps.org/departures_at_stop';
		const params = new URLSearchParams({
			stop_id,
			chateau_id: chateau,
			greater_than_time: String(startSec),
			less_than_time: String(endSec)
		});
		return `${base}?${params.toString()}`;
	}

	function chooseNextPageHours(count: number): number {
		if (count >= THRESHOLD_HIGH) return 2;
		if (count <= THRESHOLD_LOW) return Math.min(24, Math.max(12, currentPageHours * 2));
		return 12;
	}

	function composeEventKey(ev: any): EventKey {
		// Include chateau, trip, stop, service_date, and a stable schedule time fallback
		const sched = ev.scheduled_departure ?? ev.scheduled_arrival ?? 0;
		return `${ev.chateau}|${ev.trip_id}|${ev.stop_id}|${ev.service_date}|${sched}`;
	}

	function mergePageEvents(pageId: string, incoming: any[], refreshedAt: number) {
		for (const ev of incoming) {
			const key = composeEventKey(ev);
			const existing = eventIndex.get(key);
			if (!existing || refreshedAt > existing.refreshedAt) {
				eventIndex.set(key, { event: ev, pageId, refreshedAt });
			}
		}
		// Rebuild merged list sorted by primary time key (RT first, then scheduled)
		mergedEvents = Array.from(eventIndex.values())
			.map((v) => v.event)
			.sort((a, b) => {
				const ta = a.realtime_departure ?? a.realtime_arrival ?? a.scheduled_departure ?? a.scheduled_arrival ?? 0;
				const tb = b.realtime_departure ?? b.realtime_arrival ?? b.scheduled_departure ?? b.scheduled_arrival ?? 0;
				return ta - tb;
			});

		// Group by YYYY-MM-DD (CA locale) in stop timezone
		const grouped: Record<string, any[]> = {};
		for (const ev of mergedEvents) {
			const tz = data_meta?.primary?.timezone;
			const stamp = (ev.realtime_departure || ev.realtime_arrival || ev.scheduled_departure || ev.scheduled_arrival) * 1000;
			const code = new Date(stamp).toLocaleDateString('en-CA', tz ? { timeZone: tz } : undefined);
			if (!grouped[code]) grouped[code] = [];
			grouped[code].push(ev);
		}
		dates_to_events_filtered = grouped;

		// Compute previous_count ≤30m ago for header toggle
		const nowSec = Date.now() / 1000;
		previous_count = mergedEvents.filter((ev) => (ev.realtime_departure || ev.scheduled_departure) < nowSec - 60).length;
	}

	async function fetchPage(startSec: number, endSec: number) {
		const id = pageIdFor(startSec, endSec);
		let page = pages.find((p) => p.id === id);
		if (!page) {
			page = { id, startSec, endSec, refreshedAt: 0, loading: true };
			pages.push(page);
		}
		page.loading = true;

		try {
			const resp = await fetch(buildUrl(startSec, endSec), { mode: 'cors' });
			const text = await resp.text();
			const data = JSON.parse(text);

			// Establish/merge meta (primary/routes/shapes) — keep latest
			if (!data_meta) {
				data_meta = data;
				primeMapContextFromMeta();
			} else {
				// Merge routes/shapes per chateau
				data_meta.routes = { ...(data_meta.routes || {}), ...(data.routes || {}) };
				data_meta.shapes = { ...(data_meta.shapes || {}), ...(data.shapes || {}) };
				if (!data_meta.primary && data.primary) data_meta.primary = data.primary;
			}

			const refreshedAt = Date.now();
			page.refreshedAt = refreshedAt;
			page.loading = false;

			const events = (data.events || []) as any[];
			mergePageEvents(id, events, refreshedAt);

			// Auto-tune next page size by density
			currentPageHours = chooseNextPageHours(events.length);

			// ensure per-page refresher
			ensurePageRefresher(page);
		} catch (e) {
			page.error = (e as Error).message;
			page.loading = false;
		}
	}

	function ensurePageRefresher(page: { id: string; startSec: number; endSec: number }) {
		if (pageTimers.has(page.id)) return;
		const timer = setInterval(() => {
			// Refetch this page; newer data will win during merge
			fetchPage(page.startSec, page.endSec);
		}, PAGE_REFRESH_MS);
		pageTimers.set(page.id, timer);
	}

	function clearAllPageTimers() {
		for (const [, t] of pageTimers) clearInterval(t);
		pageTimers.clear();
	}

	function primeMapContextFromMeta() {
		const global_map_pointer = get(map_pointer_store);
		if (!global_map_pointer || !data_meta?.primary) return;

		if (!fly_to_already) {
			global_map_pointer.flyTo({
				center: [data_meta.primary.stop_lon, data_meta.primary.stop_lat],
				zoom: 14
			});
			fly_to_already = true;
		}

		global_map_pointer.getSource('redpin')?.setData({
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: {},
					geometry: {
						coordinates: [data_meta.primary.stop_lon, data_meta.primary.stop_lat],
						type: 'Point'
					}
				}
			]
		});

		const geojson_shapes_list: any[] = [];
		for (const [chateau_id, routes] of Object.entries<any>(data_meta.routes || {})) {
			for (const [route_id, route] of Object.entries<any>(routes)) {
				for (const shape_id of route.shapes_list || []) {
					const enc = data_meta.shapes?.[chateau_id]?.[shape_id];
					if (enc) {
						geojson_shapes_list.push({
							geometry: polyline.toGeoJSON(enc),
							properties: { color: route.color }
						});
					}
				}
			}
		}

		global_map_pointer.getSource('transit_shape_context_for_stop')?.setData({
			type: 'FeatureCollection',
			features: geojson_shapes_list
		});
		global_map_pointer.getSource('transit_shape_context')?.setData({ type: 'FeatureCollection', features: [] });
		global_map_pointer.getSource('stops_context')?.setData({ type: 'FeatureCollection', features: [] });
	}

	async function loadInitialPages() {
		const nowSec = Math.floor(Date.now() / 1000);
		// Start a little bit in the past for continuity
		const start = nowSec - 30 * 60; // 30m back
		const end = start + currentPageHours * 3600;
		await fetchPage(start, end);
	}

	async function loadNextPage() {
		if (pages.length === 0) return loadInitialPages();
		// find max endSec among pages
		let maxEnd = Math.max(...pages.map((p) => p.endSec));
		const start = maxEnd - OVERLAP_SECONDS; // overlap to dedupe
		const end = start + currentPageHours * 3600;
		await fetchPage(start, end);
	}

	// Infinite scroll detection
	let scrollContainer: HTMLDivElement;
	function onScroll(e: Event) {
		const el = e.currentTarget as HTMLDivElement;
		if (!el) return;
		const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 300; // 300px buffer
		if (nearBottom) {
			loadNextPage();
		}
	}

	// React to input changes
	$: if (chateau && stop_id) {
		resetState();
		clearAllPageTimers();
		loadInitialPages();
	}

	onMount(() => {
		resetState();
		loadInitialPages();

		current_time = Date.now();
		const tick = setInterval(() => (current_time = Date.now()), 500);

		return () => {
			clearInterval(tick);
			clearAllPageTimers();
			const global_map_pointer = get(map_pointer_store);
			global_map_pointer?.getSource('redpin')?.setData({ type: 'FeatureCollection', features: [] });
		};
	});
</script>

<div class="h-full">
	<HomeButton />

	<div bind:this={scrollContainer} class="catenary-scroll overflow-y-auto pb-64 h-full pr-2" on:scroll={onScroll}>
		<div class="flex flex-col">
			<div>
				{#if data_meta}
					<div class="flex flex-row ml-1">
						<h2 class="text-lg font-bold">{data_meta.primary.stop_name}</h2>
						<p class="ml-auto align-middle">
							<Clock time_seconds={current_time / 1000} show_seconds={true} timezone={data_meta.primary.timezone} />
						</p>
					</div>
					<p class="text-sm ml-1">{data_meta.primary.timezone}</p>

					{#if previous_count > 0}
						<button class="px-0 py-3 font-bold" on:click={() => (show_previous_departures = !show_previous_departures)}>
							<p class="align-middle flex flex-row">
								<span class="inline-block align-bottom">
									{#if show_previous_departures}
										<span class="material-symbols-outlined"> keyboard_arrow_up </span>
									{:else}
										<span class="material-symbols-outlined"> keyboard_arrow_down </span>
									{/if}
								</span>
								<span>{$_('previous_departures')}</span>
							</p>
						</button>
					{/if}

					{#if Object.keys(dates_to_events_filtered).length > 0}
						{#each Object.keys(dates_to_events_filtered) as date_code}
							<p class="text-md font-semibold mt-0 mb-1 mx-3">
								{new Date(date_code).toLocaleDateString(
									timezone_to_locale(locale_inside_component, data_meta.primary.timezone),
									{ year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long', timeZone: 'UTC' }
								)}
							</p>

							{#each dates_to_events_filtered[date_code].filter((event) => {
								let cutoff = 60;
								if (show_previous_departures) cutoff = 1800;
								return (event.realtime_departure || event.scheduled_departure) >= current_time / 1000 - cutoff;
							}) as event}
								<div
									class="mx-1 py-1 border-b-1 border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
									on:click={() => {
										data_stack_store.update((x) => {
											x.push(new StackInterface(new SingleTrip(event.chateau, event.trip_id, event.route_id, null, event.service_date.replace(/-/g, ''), null, null)));
											return x;
										});
									}}
								>
									<div class={(event.realtime_departure || event.scheduled_departure) < current_time / 1000 && event.scheduled_departure < current_time / 1000 ? 'opacity-80' : ''}>
										<p>
											{#if data_meta.routes[event.chateau][event.route_id].short_name}
												<span class="rounded-xs font-bold px-0.5 mx-1 py-0.5" style={`background: ${data_meta.routes[event.chateau][event.route_id].color}; color: ${data_meta.routes[event.chateau][event.route_id].text_color};`}>
													{data_meta.routes[event.chateau][event.route_id].short_name}
												</span>
											{:else if data_meta.routes[event.chateau][event.route_id].long_name}
												<span class="rounded-xs font-semibold px-0.5 mx-1 py-0.5" style={`background: ${data_meta.routes[event.chateau][event.route_id].color}; color: ${data_meta.routes[event.chateau][event.route_id].text_color};`}>
													{data_meta.routes[event.chateau][event.route_id].long_name}
												</span>
											{/if}
											{#if event.trip_short_name}
												<span class="font-bold">{event.trip_short_name}</span>
											{/if}
											{event.headsign}
										</p>

										{#if event.last_stop}
											<p><span class="ml-1 text-xs font-bold align-middle"> {$_('last_stop')}</span></p>
										{/if}
									</div>

									<StopScreenRow {event} data_from_server={data_meta} {current_time} {show_seconds} />

									{#if event.platform_string_realtime}
										<p>{event.platform_string_realtime}</p>
									{/if}
									{#if event.vehicle_number}
										<p>{$_('vehicle')}: {event.vehicle_number}</p>
									{/if}
								</div>
							{/each}
						{/each}

						<!-- Loader / pager hint -->
						<div class="w-full text-center py-4 text-sm opacity-80">
							{#if pages.some((p) => p.loading)}
								<span>{$_("loadingmoredepartures")}…</span>
							{:else}
								
							{/if}

							<button class="underline" on:click={loadNextPage}>{$_("Load more")}</button>
						</div>
					{:else}
						<p class="ml-2">Loading…</p>
					{/if}
				{:else}
					<p class="ml-2">Loading…</p>
				{/if}
			</div>
		</div>
	</div>
</div>
