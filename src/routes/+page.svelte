<script lang="ts">
    import mapboxgl from 'mapbox-gl';
import { onMount } from 'svelte';

import { decode as decodeToAry, encode as encodeAry } from 'base65536';
import SidebarInternals from '../components/sidebarInternals.svelte';
import {
		MapSelectionScreen,
		StackInterface,
		MapSelectionOption,
		SingleTrip,
		VehicleMapSelector,
		RouteStack,
		StopStack,
		RouteMapSelector
	} from '../components/stackenum';
    
	import i18n from '../i18n/strings';

let centerinit = [-118, 33.9];

let zoominit = 8.1;

const decode = (textToDecode: string) => {
    try {
        return new TextDecoder().decode(decodeToAry(textToDecode));
    } catch (e) {
        return 'Decode failed: Invalid input';
    }
};


    let sidebarOpen:string = "middle";
let sidebar_height_output: string = "100vh";
//percentage
let sidebar_height_number: number = 40;
//percentage
let sidebar_height_target: number = 40;
let previous_form_factor: string = "mobile";
let start_of_move_pointer_height: number | null = null;
let start_of_move_sidebar_height: number | null = null;
let last_sidebar_release: number | null = null;
let last_sidebar_interval_id: number | null = null;
let map_padding: Record<string, number> = {};
let previous_click_on_sidebar_dragger: number | null = null;
let previous_y_velocity_sidebar: number | null = null;

let currently_holding_sidebar_grabber: boolean = false;

let darkMode = true;

let strings = i18n.en;
let locale = 'en';

if (typeof window !== 'undefined') {
		// this must be fixed to allow subvariants of languages
		// @ts-expect-error
		strings = i18n[window.localStorage.language || 'en'];
		locale = window.localStorage.language || 'en';
	}

	//false means use metric, true means use us units
	let selectedSettingsTab = 'localrail';
	let usunits = false;

	let announcermode = false;
	//stores geojson data for currently rendered GeoJSON realtime vehicles data, indexed by realtime feed id
	let geometryObj: Record<string, any> = {};
	let lasttimeofnorth = 0;
	let westOfMinus52 = true;
	let feed_id_to_chateau_lookup: Record<string, string> = {};
	let chateau_to_realtime_feed_lookup: Record<string, string[]> = {};
	let pending_chateau_rt_request: Record<string, number> = {};
	let on_sidebar_trigger = 0;

	let data_stack: StackInterface[] = [];
	let latest_item_on_stack: StackInterface | null = null;


const urlParams =
    typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();

if (typeof window != "undefined") {
  
    if (
        localStorage.theme === 'light' ||
        (urlParams.get('framework-colorway') == 'light' && embedmode) ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)
    ) {
        console.log('dark mode triggered');
        document.documentElement.classList.remove('dark');
        darkMode = false;
    } else {
        document.documentElement.classList.add('dark');
        darkMode = true;
    }
}

function getSidebarOpenPercentage() {
    if (window.innerWidth >= 640) {
        return 0.55
    } else {
        return 0.33
    }
}

function gpsbutton_bottom_offset_calc() {
    if (typeof window != "undefined") {
        if (window.innerWidth >= 640) {
        return "32px"
    } else {
        return `${(32 - dragger) + document.getElementById('catenary-sidebar')?.offsetHeight}px`
    }
    } else {
        return "32px";
    }
}

const dragger = 24;

let style: string | undefined = darkMode
			? 'mapbox://styles/kylerschin/clm2i6cmg00fw01of2vp5h9p5'
			: 'mapbox://styles/kylerschin/cllpbma0e002h01r6afyzcmd8';

function mousemovesidebar(e:TouchEvent | MouseEvent) {
    clearInterval(last_sidebar_interval_id);
//	console.log('sidebar mouse move' ,e)
    //console.log('mousemovesidebar', Date.now(), e);

    //calculate y velocity

    let y_velocity = 0;

    let clientY = 0;
    if (e instanceof MouseEvent) {
        clientY = e.clientY;
    } else {
        clientY = e.touches[0].clientY;
    }

    if (previous_click_on_sidebar_dragger != null) {
        y_velocity = clientY - previous_click_on_sidebar_dragger;
        previous_y_velocity_sidebar = y_velocity;
    }

    previous_click_on_sidebar_dragger = clientY;

//	console.log("previous_y_velocity_sidebar", previous_y_velocity_sidebar);

    if (window.innerWidth < 768) {
            if (start_of_move_pointer_height != null && start_of_move_sidebar_height != null) {
                let y_velocity = previous_y_velocity_sidebar || 0;
            //	console.log('difference and velocity', start_of_move_pointer_height - clientY, y_velocity)
                let difference = (start_of_move_pointer_height - clientY) - y_velocity;
                //console.log('sidebar new difference', difference);
                sidebar_height_number = start_of_move_sidebar_height + difference;
                //console.log('sidebar new height', sidebar_height_number);

                sidebar_height_output = sidebar_height_number + "px";

                /*
                if (clientY < dragger) {
                    sidebar_height_number = window.innerHeight - dragger;
                sidebar_height_output = window.innerHeight - dragger + "px";
                } else {
                //	console.log('below top bound')
                    //sidebar_height_output = sidebar_height_number + "px";
                    if (clientY > window.innerHeight - dragger) {
                    //	console.log('at bottom bound')
                        sidebar_height_number = dragger;
                        sidebar_height_output = dragger + "px";
                    } else {
                    //	console.log('nominal')
                        sidebar_height_number = sidebar_height_number;
                        sidebar_height_output = sidebar_height_number + "px";
                    }
                }*/

                if ((clientY + (10 * y_velocity)) > 0.7 * window.innerHeight) {
                    sidebarOpen = "none";
                } else {
                    if (clientY + (10 * y_velocity) < 0.3 * window.innerHeight) {
                        sidebarOpen = "full";
                    } else {
                        sidebarOpen = "middle";
                    }
                }
            }
    }

    //console.log('sidebar new target', sidebarOpen, clientY);
}

function startmovesidebar(e:TouchEvent | MouseEvent) {
    currently_holding_sidebar_grabber=true;
    if (e instanceof MouseEvent) {
        start_of_move_pointer_height = e.clientY;
    } else {
        start_of_move_pointer_height = e.touches[0].clientY;
    }
    start_of_move_sidebar_height = document.getElementById('catenary-sidebar').offsetHeight;
    console.log('start moving sidebar')
}

function setSidebarOpen() {
    if (window.innerWidth < 768) {
        sidebarOpen = "middle";
    } else {
        sidebarOpen = "full";
    }
    
    moveToPos({});
}

function moveToPos(values:any) {
    console.log("let go sidebar")

    last_sidebar_release = performance.now();

    if (last_sidebar_interval_id != null) {
        clearInterval(last_sidebar_interval_id);
    }

    last_sidebar_interval_id = setInterval(() => {
        if (window.innerWidth < 768) {
            let target = 0.55 * window.innerHeight;

            if (sidebarOpen == "full") {
                target = window.innerHeight - dragger;
            } else {
                if (sidebarOpen == "none") {
                    target = dragger;
                }
            }

            if (sidebar_height_number > innerHeight) {
                sidebar_height_number = innerHeight;
            }

            if (sidebar_height_number < dragger) {
                sidebar_height_number = dragger;
            }

            if (sidebar_height_number < target) {
                sidebar_height_number += 0.1 * (target - sidebar_height_number);
                sidebar_height_output = sidebar_height_number + "px";
            } else {
                if (sidebar_height_number > target) {
                    sidebar_height_number -= 0.1 * (sidebar_height_number - target);
                    sidebar_height_output = sidebar_height_number + "px";
                } else {
                    clearInterval(last_sidebar_interval_id);
                }
            }
        }
    }, 1);
}

function letgosidebar(e:Event) {
    moveToPos({event: e});
    //change_map_padding();
}

if (typeof window != 'undefined') {
    if (window.innerWidth < 768) {
        sidebarOpen = "middle";
        sidebar_height_output = (getSidebarOpenPercentage() * window.innerHeight) + "px";
        //px from bottom
        sidebar_height_number = dragger;
        //px from bottom
        sidebar_height_target = dragger;
        previous_form_factor = "mobile";
    } else {
        sidebarOpen = "full";
        sidebar_height_output = "100vh";
        //px from bottom
        sidebar_height_number = window.innerHeight - dragger;
        //px from bottom
        sidebar_height_target = window.innerHeight - dragger;
        previous_form_factor = "desktop";
    }


    addEventListener('resize', (e) => {
        console.log('resize', window.innerWidth);

        if (previous_form_factor == "mobile") {
            if (sidebarOpen = "full") {
                sidebarOpen = "middle";
            }
        }

        if (previous_form_factor == "desktop") {
            if (sidebarOpen == "middle") {
                sidebarOpen = "full";
            }
        }

        if (window.innerWidth < 768) {
            previous_form_factor = "mobile";
            if (sidebarOpen == "full") {
                sidebar_height_output = window.innerHeight + "px";
            }
            if (sidebarOpen == "middle") {
                sidebar_height_output = (getSidebarOpenPercentage() * window.innerHeight) + "px";
            } else {
                if (sidebarOpen == "none") {
                    sidebar_height_output = "20px";
                }
            }
        } else {
            previous_form_factor = "desktop";
            sidebar_height_output = "100vh";
        }
    });

    addEventListener('touchmove', (e) => {
    console.log('touchmove', e)
        if (currently_holding_sidebar_grabber) {
            console.log('sidebar touchmove', e)
            mousemovesidebar(e);
        }
    });

    
    addEventListener('mousemove', (e) => {
        if (currently_holding_sidebar_grabber) {
            console.log('sidebar mousemove', e)
            mousemovesidebar(e);
        }
    });

    let sidebar_grabber = document.getElementById('catenary-grabber');

   if (sidebar_grabber != null) {
    sidebar_grabber.addEventListener('touchstart', (e) => {
        startmovesidebar(e);
    });

    sidebar_grabber.addEventListener('mousedown', (e) => {
       startmovesidebar(e);
    });
   } else {
          console.log('sidebar grabber not found')
   }

    addEventListener('touchend', (e) => {
        if (currently_holding_sidebar_grabber) {
            console.log("Let go")
            currently_holding_sidebar_grabber = false;
            letgosidebar(e);
        }
    });

    addEventListener('mouseup', (e) => {
        if (currently_holding_sidebar_grabber) {
            
            currently_holding_sidebar_grabber = false;
            letgosidebar(e);
        }
    });
}

onMount(() => {
    const map = new mapboxgl.Map({
        container: 'map',
        crossSourceCollisions: true,
        hash: 'pos',
        useWebGL2: true,
        preserveDrawingBuffer: false,
        attributionControl: false,
        //	antialias: true,
        style: "", // stylesheet location
        accessToken: decode(
            'ꉰ騮罹縱𒁪险ꌳ轳罘蹺鴲靰繩繳穭葩罩陪筪陳繪輰艈艷繄艺筮陷荘靨ꍄ荲鵄繫敮謮轤𔕰𖥊浊豧扁缭𠁎詫鐵ᕑ'
        ),
        center: centerinit, // starting position [lng, lat]
        //keep the centre at Los Angeles, since that is our primary user base currently
        //switch to IP geolocation and on the fly rendering for this soon
        zoom: zoominit, // starting zoom (must be greater than 8.1)
        fadeDuration: 0
    });
});
</script>

<svelte:head>
	<script>
		(function (w, d, s, l, i) {
			w[l] = w[l] || [];
			w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
			var f = d.getElementsByTagName(s)[0],
				j = d.createElement(s),
				dl = l != 'dataLayer' ? '&l=' + l : '';
			j.async = true;
			j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
			f.parentNode.insertBefore(j, f);
		})(window, document, 'script', 'dataLayer', 'GTM-WD62NKLX');
	</script>
	<!-- End Google Tag Manager -->
	<!-- Primary Meta Tags -->
	<title>Catenary Maps</title>
	<meta name="title" content="Catenary Maps" />
	<meta
		name="description"
		content="Realtime bus and train location tracking, stop times prediction, analysis, and routing algorithm calculations."
	/>
	<meta name="viewport" content="width=device-width, user-scalable=no" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Catenary Maps" />
	<meta
		property="og:description"
		content="Realtime bus and train location tracking, stop times prediction, analysis, and routing algorithm calculations."
	/>
	<meta property="og:image" content="https://catenarymaps.org/screenshot1.png" />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content="Catenary Maps" />
	<meta
		property="twitter:description"
		content="Realtime bus and train location tracking, stop times prediction, analysis, and routing algorithm calculations."
	/>
	<meta property="twitter:image" content="https://transitmap.kylerchin.com/screenshot1.png" />

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin={true} />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0"
	/>
</svelte:head>
<div class="w-full" >
<div id="map" class="fixed top-0 left-0 w-[100vw] h-[100vh]" />
<div
id="catenary-sidebar"
style={`height: ${sidebar_height_output}`}
class="z-40 rounded-t-2xl md:rounded-none fixed bottom-0 shadow-lg dark:shadow-gray-800 w-full sm:w-2/5 md:h-full md:w-[380px] lg:w-[408px] bg-white dark:bg-slate-900 md:dark:bg-opacity-90 backdrop-blur-md md:bg-opacity-90 md:dark:backdrop-blur-md md:fixed md:left-0 md:top-0 md:bottom-0 text-black dark:text-white"
>
<div class="block md:hidden py-2 flex flex-row"
    on:mousedown={startmovesidebar}
    on:touchstart={startmovesidebar}
    aria-label="Move sidebar"
    role="none"
    >
        <div class='mx-auto rounded-lg px-8 py-1 bg-sky-500 dark:bg-sky-400'></div>
    </div>
    <SidebarInternals
        latest_item_on_stack={null}
    />
</div>
</div>

<style>
* {
    cursor: default;
    font-family: 'din-2014', sans-serif;
    user-select: none;
}

.material-symbols-outlined {
    font-family: 'Material Symbols Outlined', sans-serif;
}

:global(.mapboxgl-canvas) {
    outline: none;
}

.lineNumber {
    font-size: 1.2rem;
    font-weight: 600;
    padding: 5px;
    border-radius: var(--radius);
}

.lineLogo {
    margin-bottom: 15px;
}

.material-symbols-outlined-big {
    font-variation-settings:
        'FILL' 0,
        'wght' 400,
        'GRAD' 0,
        'opsz' 64;
}
</style>
