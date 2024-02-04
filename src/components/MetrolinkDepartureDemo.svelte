<script lang="ts" context="module">
	export interface MetrolinkTrackArrivals {
		TrainDesignation: string;
		RouteCode: string;
		TrainDestination: string;
		PlatformName: string;
		EventType: string;
		TrainMovementTime: string;
		CalcTrainMovementTime: string;
		FormattedTrainMovementTime: string;
		FormattedTrackDesignation: string;
		calculatedStatus: string;
		PTCStatus: string;
		isTBD: boolean | string;
	}
</script>

<script lang="ts">

    export let selectedStop:string;
	export let metrolinkDemoArrivals: MetrolinkTrackArrivals;
	export let darkMode: boolean;

    function h_m_clock_to24(input:string) {
        let time_and_suffix = input.split(" ");

        let hour_and_min_original = time_and_suffix[0].split(":");

        let hour = Number(hour_and_min_original[0]);
        let min = Number(hour_and_min_original[1]);
        let new_hour:number = 0;

        if (time_and_suffix[1] == "PM") {
            //is pm
            if (hour == 12) {
                new_hour = 12;
            } else {
                new_hour = hour + 12;
            }
        } else {
            //is am
            if (hour == 12) {
                new_hour = 0;
            } else {
                new_hour = hour;
            }
        }

        return(`${("0" + new_hour).slice(-2)}:${("0" + min).slice(-2)}`);
    }

    const expandMetrolinkColorsDark:Record<string,string> = {
		'AV LINE': 'rgb(130, 216, 163)',
		'IEOC LINE': 'rgb(243, 134, 181)',
		'OC LINE': 'rgb(255, 157, 51)',
		'SB LINE': 'rgb(205, 134, 145)',
		'VC LINE': 'rgb(255, 191, 51)',
		'91/PV Line': '#0071ce',
		'RVS LINE': 'rgb(198, 177, 210)',
		'PAC SURF': 'rgb(147, 200, 234)',
		'SUN LTD': 'rgb(147, 200, 234)',
		ARROW: '#B0DE3B'
	};

	const expandMetrolinkColorsLight:Record<string,string> = {
		'AV LINE': '#1c9d03',
		'IEOC LINE': '#bd295a',
		'OC LINE': '#ff7600',
		'SB LINE': '#a32136',
		'VC LINE': '#f6a704',
		'91/PV Line': '#0071ce',
		'RVS LINE': '#682e86',
		'PAC SURF': '#18567D',
		'SUN LTD': '#18567D',
		ARROW: '#B0DE3B'
	};

	function get_route_colour(route_id:string): string {
	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		if (expandMetrolinkColorsDark[route_id]) {
			return expandMetrolinkColorsDark[route_id];
		} else {
			return "#ffffff";
		}
	}	else {
		if (expandMetrolinkColorsLight[route_id]) {
			return expandMetrolinkColorsLight[route_id];
		} else {
			return "#000000";
		}
	}
	}

	const expandMetrolink: Record<string, string> = {
		AV: 'Antelope Valley',
		IEOC: 'Inland Empire-Orange County',
		OC: 'Orange County',
		SB: 'San Bernardino',
		VC: 'Ventura County',
		'91': '91/Perris Valley',
		RIV: 'Riverside',
		"SUN LTD": "Sunset Limited",
		'AV LINE': 'Antelope Valley Line',
		'IEOC LINE': 'Inland Empire-Orange County Line',
		'OC LINE': 'Orange County Line',
		'SB LINE': 'San Bernardino Line',
		'VC LINE': 'Ventura County Line',
		'91/PV Line': '91 Line',
		'RVS LINE': 'Riverside Line',
		'PAC SURF': 'Pacific Surfliner',
		ARROW: 'Arrow Service'
	};

	function expand_metrolink_route_lookup(input: string):string {
		if (typeof expandMetrolink[input] == "string") {
			return expandMetrolink[input];
		} else {
			return input;
		}
	}

	const expandMetrolinkStops:Record<string,string> = {
		'L. A. Union Metrolink': 'LAUS',
		'Los Angeles': 'LAUS',
		// 'Commerce Metrolink': 'COMMERCE',
		// 'Norwalk/ Santa Fe Springs Metrolink': 'NORWALK-SANTAFESPRINGS',
		// 'Buena Park Metrolink': 'BUENAPARK',
		'Fullerton Metrolink': 'FULLERTON',
		'Fullerton Amtrak': 'FULLERTON',
		'Anaheim-ARTIC Metrolink': 'ARTIC',
		'Anaheim': 'ARTIC',
		// 'Orange Metrolink': 'ORANGE',
		'Santa Ana Metrolink': 'SANTA ANA',
		'Santa Ana': 'SANTA ANA',
		// 'Tustin Metrolink': 'TUSTIN',
		'Irvine Metrolink': 'IRVINE',
		'Irvine': 'IRVINE',
		// 'Laguna Niguel/ Mission Viejo Metrolink': 'LAGUNANIGUEL-MISSIONVIEJO',
		'San Juan Capistrano Metrolink': 'SAN JUAN CAPISTRANO',
		'San Juan Capistrano Amtrak': 'SAN JUAN CAPISTRANO',
		// need to wait until tracks reopen
		// 'San Clemente Metrolink': '',
		// 'San Clemente Pier Metrolink': '',
		// 'San Clemente Pier Amtrak': '',
		// 'Oceanside Metrolink': 'OCEANSIDE',
		// 'Oceanside': 'OCEANSIDE',
		// 'Montebello/ Commerce Metrolink': 'MONTEBELLO',
		// 'Industry Metrolink': 'INDUSTRY',
		// 'Downtown Pomona Metrolink': 'POMONA-DOWNTOWN',
		// 'East Ontario Metrolink': 'ONTARIO-EAST',
		// 'Jurupa Valley/Pedley Metrolink': 'PEDLEY',
		// 'Anaheim Canyon Metrolink': 'ANAHEIM-CANYON',
		// 'West Corona Metrolink': 'CORONA-WEST',
		// 'North Main Corona Metrolink': 'MAIN-CORONA-NORTH',
		// 'Riverside-La Sierra Metrolink': 'RIVERSIDE-LA SIERRA',
		// 'Riverside-Downtown Metrolink': 'RIVERSIDE-DOWNTOWN',
		// 'Riverside-Hunter Park/Ucr': 'RIVERSIDE-HUNTERPARK',
		// 'Moreno Valley/March Field': 'MORENO-VALLEY-MARCH-FIELD',
		// 'Perris Downtown': 'PERRIS-DOWNTOWN',
		// 'South Perris': 'PERRIS-SOUTH',
		// 'San Bernardino Depot Metrolink': 'SAN BERNARDINO',
		// 'San Bernardino - Downtown Metrolink': 'SANBERNARDINOTRAN',
		// 'San Bernardino - Tippecanoe Metrolink': 'SANBERNARDINO-TIPPECANOE',
		// 'Redlands - Esri Metrolink': 'REDLANDS-ESRI',
		// 'Redlands - Downtown Metrolink': 'REDLANDS-DOWNTOWN-ARROW',
		// 'Redlands - University Metrolink': 'REDLANDS-UNIVERSITY',
		// 'Rialto Metrolink': 'RIALTO',
		// 'Fontana Metrolink': 'FONTANA',
		// 'Rancho Cucamonga Metrolink': 'RANCHO CUCAMONGA',
		// 'Upland Metrolink': 'UPLAND',
		// 'Montclair Metrolink': 'MONTCLAIR',
		// 'Claremont Metrolink': 'CLAREMONT',
		// 'Pomona (North) Metrolink': 'POMONA-NORTH',
		// 'Covina Metrolink': 'COVINA',
		// 'Baldwin Park Metrolink': 'BALDWINPARK',
		// 'El Monte Metrolink': 'ELMONTE',
		// 'Cal State LA Metrolink': 'CALSTATE',
		// 'Lancaster Metrolink': 'LANCASTER',
		// 'Palmdale Metrolink': 'PALMDALE',
		// 'Vincent Grade/Acton Metrolink': 'VINCENT GRADE/ACTON',
		// 'Vista Canyon Metrolink': 'VISTA-CANYON',
		// 'Via Princessa Metrolink': 'VIA PRINCESSA',
		// 'Santa Clarita Metrolink': 'SANTA CLARITA',
		// 'Newhall Metrolink': 'NEWHALL',
		// 'Sylmar/San Fernando Metrolink': 'SYLMAR/SAN FERNANDO',
		// 'Sun Valley Metrolink': 'SUN VALLEY',
		// 'Burbank Airport - North (Av Line) Metrolink': 'BURBANK-AIRPORT-NORTH',
		'Downtown Burbank Metrolink': 'DOWNTOWN BURBANK',
		'BBK': 'DOWNTOWN BURBANK',
		'Glendale Metrolink': 'GLENDALE',
		'Glendale Amtrak': 'GLENDALE',
		'Burbank Airport - South (Vc Line) Metrolink': 'BURBANK-AIRPORT-SOUTH',
		'Burbank Amtrak': 'BURBANK-AIRPORT-SOUTH',
		'Van Nuys Metrolink': 'VAN NUYS',
		'Van Nuys': 'VAN NUYS',
		'Northridge Metrolink': 'NORTHRIDGE',
		'NRG': 'NORTHRIDGE',
		'Chatsworth Metrolink': 'CHATSWORTH',
		'Chatsworth': 'CHATSWORTH',
		'Simi Valley Metrolink': 'SIMIVALLEY',
		'Simi Valley Amtrak': 'SIMIVALLEY',
		'Moorpark Metrolink': 'MOORPARK',
		'Moorpark Amtrak': 'MOORPARK',
		'Camarillo Metrolink': 'CAMARILLO',
		'Camarillo Amtrak': 'CAMARILLO',
		'Oxnard Metrolink': 'OXNARD',
		'Oxnard': 'OXNARD',
		'East Ventura Metrolink': 'VENTURA-EAST'
	};
</script>

<h1 class="text-3xl">
    {selectedStop
        .replace('Burbank Amtrak', 'Burbank Airport South')
        .replace('Burbank Airport - North (Av Line)', 'Burbank Airport North')
        .replace('Burbank Airport - South (Vc Line)', 'Burbank Airport South')
        .replace('-ARTIC', '')
        .replace('Los Angeles', 'Union Station')
        .replace('L. A. Union Metrolink', 'Union Station')
        .replace('Metrolink', '')
        .replace('Amtrak', '')}
</h1>
{#each metrolinkDemoArrivals as { RouteCode, CalculatedStatus, TrainDesignation, TrainDestination, PlatformName, EventType, FormattedTrainMovementTime, FormattedCalcTrainMovementTime, FormattedTrackDesignation }, i}
    {#if PlatformName == expandMetrolinkStops[selectedStop]}
        <div class="mb-4"></div>
        <span class="text-xl" style:color={get_route_colour(RouteCode)}
            ><b>{TrainDesignation.replace('M', '')}</b> { expand_metrolink_route_lookup(RouteCode)}</span
        >
        <br />
        <span class="text-lg">&rarr; {TrainDestination}</span>
        <br />
        <span class="text-md">
            {#if FormattedCalcTrainMovementTime != FormattedTrainMovementTime}
                <s>{h_m_clock_to24(FormattedTrainMovementTime)}</s>
            {/if}
            <b
				class={FormattedCalcTrainMovementTime != FormattedTrainMovementTime ? "text-yellow-700 dark:text-[#f9e300]" : ""}
                >{h_m_clock_to24(FormattedCalcTrainMovementTime)}</b
            >
            ·
            {FormattedTrackDesignation} ·
            <span style:color={CalculatedStatus == 'ON TIME' ? 'green' : 'red'}
                >{CalculatedStatus} {EventType}</span
            >
        </span>
    {/if}
{/each}
<br /><br />
<i
    >No further arrivals are available. Maybe we don't know about this stop yet, or no more
    trains are leaving soon?</i
>