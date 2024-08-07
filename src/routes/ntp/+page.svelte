<script lang="ts">
	let last_synced_client_time: number | null;
	let offset: number | null;
	let last_fetched: number | null;

	let current_time_client_ns: number;
	let current_time_server_ns: number | null;

	current_time_client_ns = Date.now() * 1e6;

	function fetchTime() {
		let fetchstart = Date.now() * 1e6;
		fetch('https://kylerchin.com/ntpns?c=' + Date.now() * 1e6)
			.then((response) => response.text())
			.then((body) => {
				let fetchend = Date.now() * 1e6;

				if (body !== null) {
					let split = body.split('|');

					const serverClientRequestDiffTime = Number(split[1]);
					const serverTimestamp = Number(split[0]);

					console.log('timestamp', serverTimestamp);
					console.log('fetchend', fetchend);

					const serverClientResponseDiffTime = fetchend - serverTimestamp;

					console.log('serverClientRequestDiffTime', serverClientRequestDiffTime);
					console.log('serverClientResponseDiffTime', serverClientResponseDiffTime);

					let result =
						(serverClientRequestDiffTime - fetchstart + fetchend - serverClientResponseDiffTime) /
						2;

					console.log('result', result / 1e6);
				}
			})
			.catch((error) => {
				console.error(error);
			});
	}

	function calcServerTime() {
		if (offset != null) {
			return Date.now() * 1e6 + (offset + (data.ServerTime - nowTimeStamp)) / 2;
		}
	}

	setInterval(() => {
		current_time_client_ns = Date.now() * 1e6;
	}, 20);

	fetchTime();

	setInterval(() => {
		fetchTime();
	}, 10000);
</script>

<p class="">
	<span class="font-bold">Client ISO8601</span>
	<span class="font-mono">{new Date(current_time_client_ns / 1e6)}</span>
</p>
<p>
	<span class="font-bold">Client Unix Time</span>
	<span class="font-mono">{(current_time_client_ns / 1e9).toFixed(3)}</span>
</p>
