const martinpool = ['https://martin.catenarymaps.org', 'https://martinmeerkat.catenarymaps.org'];

const kactuspool = ['https://kactus.catenarymaps.org', 'https://kactus-meerkat.catenarymaps.org'];

const backendpool = [
	'https://backend.catenarymaps.org',
	'https://backend-meerkat.catenarymaps.org'
];

const martin_uptime = new Map();

export function check_martin() {
	martinpool.forEach((url) => {
		fetch(url + '/catalog')
			.then((response) => {
				martin_uptime.set(url, response.ok == true);
			})
			.catch((error) => {
				martin_uptime.set(url, false);
			});
	});
}

export function check_kactus() {
	kactuspool.forEach((url) => {
		fetch(url + '/gtfsrttimes')
			.then((response) => {
				kactus_uptime.set(url, response.ok == true);
			})
			.catch((error) => {
				kactus_uptime.set(url, false);
			});
	});
}

const backend_uptime = new Map();

export function check_backend() {
	backendpool.forEach((url) => {
		fetch(url)
			.then((response) => {
				backend_uptime.set(url, response.ok == true);
			})
			.catch((error) => {
				backend_uptime.set(url, false);
			});
	});
}

check_martin();
check_backend();

function pick_valid_url(pool: Array<string>, map: Map<string, boolean>) {
	if (map.size == 0) {
		return pool[0];
	} else {
		const valid = Object.entries(Object.fromEntries(map)).filter((pair) => pair[1] == true);

		if (valid.length > 0) {
			return valid[0][0];
		} else {
			return pool[0];
		}
	}
}

export function what_martin_to_use() {
	return pick_valid_url(martinpool, martin_uptime);
}

export function what_backend_to_use() {
	return pick_valid_url(backendpool, backend_uptime);
}

const kactus_uptime = new Map();

check_kactus();

setInterval(check_kactus, 120_000);
setInterval(check_martin, 120_000);
setInterval(check_backend, 120_000);

export function what_kactus_to_use() {
	return pick_valid_url(kactuspool, kactus_uptime);
}
