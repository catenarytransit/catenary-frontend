<script lang="ts">
    export let selectedStop:any;

    const expandMetrolinkColors:Record<string,string> = {
		'AV LINE': 'rgb(130, 216, 163)',
		'IEOC LINE': 'rgb(243, 134, 181)',
		'OC LINE': 'rgb(255, 157, 51)',
		'SB LINE': 'rgb(205, 134, 145)',
		'VC LINE': 'rgb(255, 191, 51)',
		'91/PV Line': '#0071ce',
		'RVS LINE': 'rgb(198, 177, 210)',
		'PAC SURF': 'rgb(147, 200, 234)',
		ARROW: '#B0DE3B'
	};

    const expandMetrolink = {
		AV: 'Antelope Valley',
		IEOC: 'Inland Empire-Orange County',
		OC: 'Orange County',
		SB: 'San Bernardino',
		VC: 'Ventura County',
		'91': '91/Perris Valley',
		RIV: 'Riverside',

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

	const expandMetrolinkStops:Record<string,string> = {
		'L. A. Union Metrolink': 'LAUS',
		'Los Angeles': 'LAUS',
		'Commerce Metrolink': 'COMMERCE',
		'Norwalk/ Santa Fe Springs Metrolink': 'NORWALK-SANTAFESPRINGS',
		'Buena Park Metrolink': 'BUENAPARK',
		'Fullerton Metrolink': 'FULLERTON',
		Fullerton: 'FULLERTON',
		'Anaheim-ARTIC Metrolink': 'ARTIC',
		Anaheim: 'ARTIC',
		'Orange Metrolink': 'ORANGE',
		'Santa Ana Metrolink': 'SANTA ANA',
		'Santa Ana': 'SANTA ANA',
		'Tustin Metrolink': 'TUSTIN',
		'Irvine Metrolink': 'IRVINE',
		Irvine: 'IRVINE',
		'Laguna Niguel/ Mission Viejo Metrolink': 'LAGUNANIGUEL-MISSIONVIEJO',
		'San Juan Capistrano Metrolink': 'SAN JUAN CAPISTRANO',
		'San Juan Capistrano Amtrak': 'SAN JUAN CAPISTRANO',
		// need to wait until tracks reopen
		// 'San Clemente Metrolink': '',
		// 'San Clemente Pier Metrolink': '',
		// 'San Clemente Pier Amtrak': '',
		// 'Oceanside Metrolink': '',
		// 'Oceanside': '',
		'Montebello/ Commerce Metrolink': 'MONTEBELLO',
		'Industry Metrolink': 'INDUSTRY',
		'Downtown Pomona Metrolink': 'POMONA-DOWNTOWN',
		'East Ontario Metrolink': 'ONTARIO-EAST',
		'Jurupa Valley/Pedley Metrolink': 'PEDLEY',
		'Anaheim Canyon Metrolink': 'ANAHEIM-CANYON',
		'West Corona Metrolink': 'CORONA-WEST',
		'North Main Corona Metrolink': 'MAIN-CORONA-NORTH',
		'Riverside-La Sierra Metrolink': 'RIVERSIDE-LA SIERRA',
		'Riverside-Downtown Metrolink': 'RIVERSIDE-DOWNTOWN',
		'Riverside-Hunter Park/Ucr': 'RIVERSIDE-HUNTERPARK',
		'Moreno Valley/March Field': 'MORENO-VALLEY-MARCH-FIELD',
		'Perris Downtown': 'PERRIS-DOWNTOWN',
		'South Perris': 'PERRIS-SOUTH',
		'San Bernardino Depot Metrolink': 'SAN BERNARDINO',
		'San Bernardino - Downtown Metrolink': 'SANBERNARDINOTRAN',
		'San Bernardino - Tippecanoe Metrolink': 'SANBERNARDINO-TIPPECANOE',
		'Redlands - Esri Metrolink': 'REDLANDS-ESRI',
		'Redlands - Downtown Metrolink': 'REDLANDS-DOWNTOWN-ARROW',
		'Redlands - University Metrolink': 'REDLANDS-UNIVERSITY',
		'Rialto Metrolink': 'RIALTO',
		'Fontana Metrolink': 'FONTANA',
		'Rancho Cucamonga Metrolink': 'RANCHO CUCAMONGA',
		'Upland Metrolink': 'UPLAND',
		'Montclair Metrolink': 'MONTCLAIR',
		'Claremont Metrolink': 'CLAREMONT',
		'Pomona (North) Metrolink': 'POMONA-NORTH',
		'Covina Metrolink': 'COVINA',
		'Baldwin Park Metrolink': 'BALDWINPARK',
		'El Monte Metrolink': 'ELMONTE',
		'Cal State LA Metrolink': 'CALSTATE',
		'Lancaster Metrolink': 'LANCASTER',
		'Palmdale Metrolink': 'PALMDALE',
		'Vincent Grade/Acton Metrolink': 'VINCENT GRADE/ACTON',
		'Vista Canyon Metrolink': 'VISTA-CANYON',
		'Via Princessa Metrolink': 'VIA PRINCESSA',
		'Santa Clarita Metrolink': 'SANTA CLARITA',
		'Newhall Metrolink': 'NEWHALL',
		'Sylmar/San Fernando Metrolink': 'SYLMAR/SAN FERNANDO',
		'Sun Valley Metrolink': 'SUN VALLEY',
		'Burbank Airport - North (Av Line) Metrolink': 'BURBANK-AIRPORT-NORTH',
		'Downtown Burbank Metrolink': 'DOWNTOWN BURBANK',
		'Glendale Metrolink': 'GLENDALE',
		'Burbank Airport - South (Vc Line) Metrolink': 'BURBANK-AIRPORT-SOUTH',
		'Burbank Amtrak': 'BURBANK-AIRPORT-SOUTH',
		'Van Nuys Metrolink': 'VAN NUYS',
		'Northridge Metrolink': 'NORTHRIDGE',
		'Chatsworth Metrolink': 'CHATSWORTH',
		'Simi Valley Metrolink': 'SIMIVALLEY',
		'Moorpark Metrolink': 'MOORPARK',
		'Camarillo Metrolink': 'CAMARILLO',
		'Oxnard Metrolink': 'OXNARD',
		'East Ventura Metrolink': 'VENTURA-EAST'
	};
</script>

<h1 class="text-3xl">
    {selectedStop.displayname
        .replace('Burbank Amtrak', 'Burbank Airport South')
        .replace('Burbank Airport - North (Av Line)', 'Burbank Airport North')
        .replace('Burbank Airport - South (Vc Line)', 'Burbank Airport South')
        .replace('-ARTIC', '')
        .replace('Los Angeles', 'Union Station')
        .replace('L. A. Union Metrolink', 'Union Station')
        .replace('Metrolink', '')
        .replace('Amtrak', '')}
</h1>
{#each selectedStop.arrivals as { RouteCode, CalculatedStatus, TrainDesignation, TrainDestination, PlatformName, EventType, FormattedTrainMovementTime, FormattedCalcTrainMovementTime, FormattedTrackDesignation }, i}
    {#if PlatformName == expandMetrolinkStops[selectedStop.displayname]}
        <div class="mb-4"></div>
        <span class="text-xl" style:color={expandMetrolinkColors[RouteCode]}
            ><b>{TrainDesignation.replace('M', '')}</b> {expandMetrolink[RouteCode]}</span
        >
        <br />
        <span class="text-lg">&rarr; {TrainDestination}</span>
        <br />
        <span class="text-md">
            {#if FormattedCalcTrainMovementTime != FormattedTrainMovementTime}
                <s>{FormattedTrainMovementTime}</s>
            {/if}
            <b
                style:color={FormattedCalcTrainMovementTime != FormattedTrainMovementTime
                    ? '#f9e300'
                    : 'unset'}>{FormattedCalcTrainMovementTime}</b
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