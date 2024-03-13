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
		FormattedCalcTrainMovementTime: string;
		FormattedTrackDesignation: string;
		CalculatedStatus: string;
		PTCStatus: string;
		isTBD: boolean | string;
	}
</script>

<script lang="ts">
	import metrolinkAnnouncementData from '../data/announcements/f-metrolinktrains~rt.json';

	//delete anything older than 1 day
	const METROLINK_TIMEOUT = 86_400_000;

	export let selectedStop: string;
	export let metrolinkDemoArrivals: MetrolinkTrackArrivals[];
	export let darkMode: boolean;

	let activeAnnouncement = {
		text: '',
		bgcolor: '',
		TrainDestination: '',
		RouteCode: ''
	};
	let hideAnnouncementTextTimeout = setTimeout(() => {}, 0);
	let announcementHeader = false;

	function cleanupMetrolinkUnixMsTime(input: string) {
		return Number(input.replace('/Date(', '').replace('/', ''));
	}

	function h_m_clock_to24(input: string) {
		let time_and_suffix = input.split(' ');

		let hour_and_min_original = time_and_suffix[0].split(':');

		let hour = Number(hour_and_min_original[0]);
		let min = Number(hour_and_min_original[1]);
		let new_hour: number = 0;

		if (time_and_suffix[1] == 'PM') {
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

		return `${('0' + new_hour).slice(-2)}:${('0' + min).slice(-2)}`;
	}

	const expandMetrolinkColorsDark: Record<string, string> = {
		'AV LINE': 'rgb(130, 216, 163)',
		'IEOC LINE': 'rgb(243, 134, 181)',
		'OC LINE': 'rgb(255, 157, 51)',
		'SB LINE': 'rgb(205, 134, 145)',
		'VC LINE': 'rgb(255, 191, 51)',
		'91/PV Line': '#0071ce',
		'RVS LINE': 'rgb(198, 177, 210)',
		'PAC SURF': 'rgb(147, 200, 234)',
		'SUN LTD': 'rgb(147, 200, 234)',
		'SW CHIEF': 'rgb(147, 200, 234)',
		ARROW: '#B0DE3B'
	};

	const expandMetrolinkColorsLight: Record<string, string> = {
		'AV LINE': '#1c9d03',
		'IEOC LINE': '#bd295a',
		'OC LINE': '#ff7600',
		'SB LINE': '#a32136',
		'VC LINE': '#f6a704',
		'91/PV Line': '#0071ce',
		'RVS LINE': '#682e86',
		'PAC SURF': '#18567D',
		'SUN LTD': '#18567D',
		'SW CHIEF': '#18567D',
		ARROW: '#B0DE3B'
	};

	function get_route_colour(route_id: string): string {
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			if (expandMetrolinkColorsDark[route_id]) {
				return expandMetrolinkColorsDark[route_id];
			} else {
				return '#ffffff';
			}
		} else {
			if (expandMetrolinkColorsLight[route_id]) {
				return expandMetrolinkColorsLight[route_id];
			} else {
				return '#000000';
			}
		}
	}

	const expandMetrolink: Record<string, string> = {
		'AV LINE': 'Antelope Valley Line',
		'IEOC LINE': 'Inland Empire-Orange County Line',
		'OC LINE': 'Orange County Line',
		'SB LINE': 'San Bernardino Line',
		'VC LINE': 'Ventura County Line',
		'91/PV Line': '91 Line',
		'RVS LINE': 'Riverside Line',
		'PAC SURF': 'Amtrak Pacific Surfliner',
		'SW CHIEF': 'Amtrak Southwest Chief',
		'SUN LTD': 'Amtrak Sunset Limited',
		ARROW: 'Arrow Service'
	};

	function expand_metrolink_route_lookup(input: string): string {
		if (typeof expandMetrolink[input] == 'string') {
			return expandMetrolink[input];
		} else {
			return input;
		}
	}

	const expandMetrolinkStops: Record<string, string> = {
		'L. A. Union Metrolink': 'LAUS',
		'Los Angeles': 'LAUS',
		// 'Commerce Metrolink': 'COMMERCE',
		// 'Norwalk/ Santa Fe Springs Metrolink': 'NORWALK-SANTAFESPRINGS',
		// 'Buena Park Metrolink': 'BUENAPARK',
		'Fullerton Metrolink': 'FULLERTON',
		'Fullerton Amtrak': 'FULLERTON',
		'Anaheim-ARTIC Metrolink': 'ARTIC',
		Anaheim: 'ARTIC',
		// 'Orange Metrolink': 'ORANGE',
		'Santa Ana Metrolink': 'SANTA ANA',
		'Santa Ana': 'SANTA ANA',
		// 'Tustin Metrolink': 'TUSTIN',
		'Irvine Metrolink': 'IRVINE',
		Irvine: 'IRVINE',
		// 'Laguna Niguel/ Mission Viejo Metrolink': 'LAGUNANIGUEL-MISSIONVIEJO',
		'San Juan Capistrano Metrolink': 'SAN JUAN CAPISTRANO',
		'San Juan Capistrano Amtrak': 'SAN JUAN CAPISTRANO',
		// need to wait until tracks reopen
		//'San Clemente Metrolink': '',
		// 'San Clemente Pier Metrolink': '',
		// 'San Clemente Pier Amtrak': '',
		// 'Oceanside Metrolink': 'OCEANSIDE',
		// 'Oceanside': 'OCEANSIDE',
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
		BBK: 'DOWNTOWN BURBANK',
		'Glendale Metrolink': 'GLENDALE',
		'Glendale Amtrak': 'GLENDALE',
		'Burbank Airport - South (Vc Line) Metrolink': 'BURBANK-AIRPORT-SOUTH',
		'Burbank Amtrak': 'BURBANK-AIRPORT-SOUTH',
		'Van Nuys Metrolink': 'VAN NUYS',
		'Van Nuys': 'VAN NUYS',
		'Northridge Metrolink': 'NORTHRIDGE',
		NRG: 'NORTHRIDGE',
		'Chatsworth Metrolink': 'CHATSWORTH',
		Chatsworth: 'CHATSWORTH',
		'Simi Valley Metrolink': 'SIMIVALLEY',
		'Simi Valley Amtrak': 'SIMIVALLEY',
		'Moorpark Metrolink': 'MOORPARK',
		'Moorpark Amtrak': 'MOORPARK',
		'Camarillo Metrolink': 'CAMARILLO',
		'Camarillo Amtrak': 'CAMARILLO',
		'Oxnard Metrolink': 'OXNARD',
		Oxnard: 'OXNARD',
		'East Ventura Metrolink': 'VENTURA-EAST'
	};

	const playSequence = (sounds: string[]) => {
		const playNextSound = (audio: HTMLAudioElement) => {
			audio.src = '/announcements/' + sounds[currentSoundIndex++];
			audio.currentTime = 0;
			audio.play();
		};

		let currentSoundIndex = 0;
		if (sounds.length) {
			const audioObject = new Audio();
			playNextSound(audioObject);

			audioObject.addEventListener('ended', () => {
				if (currentSoundIndex < sounds.length) {
					playNextSound(audioObject);
				}
			});
		}
	};

	function playAnnouncement(RouteCode: string, TrainDestination: string) {
		let chimeAudio = new Audio(
			TrainDestination == 'LA Union Station'
				? '/announcements/chime-inbound.mp3'
				: '/announcements/chime-outbound.mp3'
		);
		chimeAudio.play();
		announcementHeader = true;
		setTimeout(() => {
			announcementHeader = false;
			clearTimeout(hideAnnouncementTextTimeout);
			hideAnnouncementTextTimeout = setTimeout(() => {
				activeAnnouncement = {
					text: '',
					bgcolor: '',
					TrainDestination: '',
					RouteCode: ''
				};
			}, 20000);
			try {
				activeAnnouncement = {
					// @ts-ignore
					text: `The ${expand_metrolink_route_lookup(RouteCode)} train to ${TrainDestination} is now arriving. Please step back and allow riders to exit the train before boarding.`,
					bgcolor: expandMetrolinkColorsLight[RouteCode],
					TrainDestination,
					RouteCode: expand_metrolink_route_lookup(RouteCode)
				};
				// @ts-ignore
				let sequence = metrolinkAnnouncementData.arrival.pattern.map((sound) => sound.replace('[[ROUTE]]', RouteCode.toUpperCase().replace('/', '')).replace('[[DESTINATION]]', TrainDestination));
				console.log(sequence);
				playSequence(sequence);
			} catch (error) {
				activeAnnouncement = {
					text: `The ${expand_metrolink_route_lookup(RouteCode)} train to ${TrainDestination} is now arriving. Please step back and allow riders to exit the train before boarding.`,
					bgcolor: expandMetrolinkColorsLight[RouteCode],
					TrainDestination,
					RouteCode: expand_metrolink_route_lookup(RouteCode)
				};
				window.speechSynthesis.speak(
					new SpeechSynthesisUtterance(
						`The ${expand_metrolink_route_lookup(RouteCode)} train to ${TrainDestination} is now arriving. Please step back and allow riders to exit the train before boarding.`
					)
				);
			}
		}, 2000);
	}

	let tickerDisplayUpperText = 0;
	setInterval(() => {
		tickerDisplayUpperText = tickerDisplayUpperText == 0 ? 1 : 0;
	}, 1500);

	function triggerCourtesy() {
		if (activeAnnouncement.text == '') {
			let courtesyAnnouncementVariant = Math.random() < 0.5 ? 'litterbug' : 'safety';

			let chimeAudio = new Audio('/announcements/chime.mp3');
			chimeAudio.play();
			announcementHeader = true;
			setTimeout(() => {
				announcementHeader = false;
				clearTimeout(hideAnnouncementTextTimeout);
				hideAnnouncementTextTimeout = setTimeout(() => {
					activeAnnouncement = {
						text: '',
						bgcolor: '',
						TrainDestination: '',
						RouteCode: ''
					};
				}, 20000);
				activeAnnouncement = {
					// @ts-ignore
					text: metrolinkAnnouncementData.courtesy[courtesyAnnouncementVariant].text,
					bgcolor: 'white',
					TrainDestination: 'Announcement',
					RouteCode: 'Announcement'
				};
				// @ts-ignore
				playSequence(metrolinkAnnouncementData.courtesy[courtesyAnnouncementVariant].audio);
			}, 2000);
		}
	}

	if (window.localStorage.audibleArrivals == 'true') {
		setInterval(() => {
			if (window.localStorage.audibleArrivals == 'true') {
				triggerCourtesy();
			}
		}, 100000);

		setInterval(() => {
			if (window.localStorage.audibleArrivals == 'true') {
				metrolinkDemoArrivals.forEach((arrival) => {
					if (
						arrival.PlatformName == expandMetrolinkStops[selectedStop] &&
						arrival.EventType == 'Arrival'
					) {
						if (
							arrival.FormattedCalcTrainMovementTime ==
							new Date().toLocaleString('en-US', {
								hour: 'numeric',
								minute: 'numeric',
								hour12: true
							})
						) {
							playAnnouncement(arrival.RouteCode, arrival.TrainDestination);
						}
					}
				});
			}
		}, 60000);
	}
</script>

{#if activeAnnouncement.text !== ''}
	<span
		class="ticker"
		style:background-color={activeAnnouncement.RouteCode == 'Announcement'
			? 'white'
			: activeAnnouncement.bgcolor}
		style:color={activeAnnouncement.RouteCode == 'Announcement' ? 'black' : 'white'}
	>
		<span style:font-size="0.8em">
			{#if tickerDisplayUpperText == 0}
				{activeAnnouncement.TrainDestination}
			{:else}
				{activeAnnouncement.RouteCode}
			{/if}
		</span>
		<br />
		<span class="tickerscroll">
			{activeAnnouncement.text}
		</span>
	</span>
{/if}
{#if announcementHeader}
	<div class="header">
		<h1>
			<span style:font-size="0.8em" class="material-symbols-outlined">info</span><br />Announcement
		</h1>
	</div>
{/if}
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
{#each metrolinkDemoArrivals as { TrainMovementTime, RouteCode, CalculatedStatus, TrainDesignation, TrainDestination, PlatformName, EventType, FormattedTrainMovementTime, FormattedCalcTrainMovementTime, FormattedTrackDesignation }, i}
	{#if PlatformName == expandMetrolinkStops[selectedStop]}
		<div class="mb-4"></div>
		<span class="text-lg md:text-xl" style:color={get_route_colour(RouteCode)}
			><span class="font-bold">{TrainDesignation.replace('M', '')}</span>
			{expand_metrolink_route_lookup(RouteCode)}</span
		>
		<p class="md:text-lg">&rarr; {TrainDestination}</p>
		<span class="text-base md:text-md">
			{#if FormattedCalcTrainMovementTime != FormattedTrainMovementTime}
				<s>{h_m_clock_to24(FormattedTrainMovementTime)}</s>
			{/if}
			<b
				class={FormattedCalcTrainMovementTime != FormattedTrainMovementTime
					? 'text-yellow-700 dark:text-[#f9e300]'
					: ''}>{h_m_clock_to24(FormattedCalcTrainMovementTime)}</b
			>
			·
			{FormattedTrackDesignation} ·
			<span style:color={CalculatedStatus == 'ON TIME' ? 'green' : 'red'}
				>{CalculatedStatus} {EventType}</span
			>
			<a href="#" on:click={() => {
				playAnnouncement(RouteCode, TrainDestination);
			}}><span class="material-symbols-outlined">volume_up</span></a>
			{#if expandMetrolink[RouteCode]}
				{#if expandMetrolink[RouteCode].startsWith('Amtrak')}
					<br />
					<span class="text-sm text-amber-800 dark:text-[#f9e300]"
						>Amtrak fare {expandMetrolink[RouteCode].includes('Surfliner')
							? 'or compatible Rail2Rail ticket'
							: ''} required</span
					>
				{/if}{/if}
		</span>
	{/if}
{/each}
<br /><br />
<i
	>No further arrivals are available. Maybe we don't know about this stop yet, or no more trains are
	leaving soon?</i
>

<style>
	.header {
		width: 100vw;
		white-space: nowrap;
		overflow: hidden;
		position: fixed;
		bottom: 0;
		left: 0;
		background-color: #0000ff;
		color: white;
		font-size: 2rem;
		text-align: left;
		padding-left: 15px;
		z-index: 70;
		padding: 10px;
	}

	.ticker {
		width: 100vw;
		white-space: nowrap;
		overflow: hidden;
		position: fixed;
		bottom: 0;
		left: 0;
		z-index: 70;
		font-size: 2rem;
		padding: 10px;
	}

	.tickerscroll {
		display: inline-block;
		animation: marquee 20s linear infinite;
	}

	@keyframes marquee {
		0% {
			transform: translateX(30vw);
		}
		100% {
			transform: translateX(-100%);
		}
	}
</style>
