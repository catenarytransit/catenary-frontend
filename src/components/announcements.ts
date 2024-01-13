const playSequence = (sounds: string[]) => {
	const playNextSound = (audio: HTMLAudioElement) => {
		audio.src =
			'https://github.com/CatenaryMaps/announcements/raw/main/' + sounds[currentSoundIndex++];
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

let courtesySequences = [
	[
		'LAMetro/P3010%20E%20Line/A,%20E,%20and%20Green/audio/12200.wav',
		'LAMetro/P3010%20E%20Line/A,%20E,%20and%20Green/audio/12304.wav',
		'LAMetro/P3010%20E%20Line/A,%20E,%20and%20Green/audio/12305.wav'
	], // TAP with pride every time you ride
	['WMATA/PA%20Chime_sign0019.wav', 'Metrolink/ROUTE%20INTRO.wav'], // Present tickets upon request, safety
	['WMATA/PA%20Chime_sign0019.wav', 'Metrolink/NO%20LITTERING.wav'], // No one likes a litterbug
	[
		'LAMetro/P3010%20E%20Line/A,%20E,%20and%20Green/audio/12200.wav',
		'LAMetro/P3010%20E%20Line/A,%20E,%20and%20Green/audio/12306.wav',
		'LAMetro/P3010%20E%20Line/A,%20E,%20and%20Green/audio/12308.wav',
		'LAMetro/P3010%20E%20Line/A,%20E,%20and%20Green/audio/12307.wav',
		'LAMetro/P3010%20E%20Line/A,%20E,%20and%20Green/audio/12309.wav'
	], // No sexual harassment
	['SanDiegoMTS/Silence.wav'] // Because we all need a break sometimes lmao
];

export function playRandomSequence() {
	playSequence(courtesySequences[Math.floor(Math.random() * courtesySequences.length)]);
}
