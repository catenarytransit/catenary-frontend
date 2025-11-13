export async function checkClockSync() {
	const serverTimeEndpoint = 'https://birch.catenarymaps.org/microtime'; // Replace with your actual endpoint

	try {
		const clientStart = Date.now(); // Get client time before request

		const response = await fetch(serverTimeEndpoint);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.text(); // returns microseconds in string format

		const clientEnd = Date.now(); // Get client time after response

		const serverTimeUs = parseInt(data, 10); // Convert string to integer
		if (isNaN(serverTimeUs)) {
			throw new Error('Invalid server time format');
		}
		// Convert server time from microseconds to milliseconds
		const serverTime = serverTimeUs / 1000; // Convert microseconds to milliseconds

		const roundTripTime = clientEnd - clientStart;
		const offset = (clientEnd + clientStart) / 2 - serverTime;

		console.log(`Client Start Time: ${clientStart} ms`);
		console.log(`Client End Time: ${clientEnd} ms`);
		console.log(`Server Time Received: ${serverTime} ms`);
		console.log(`Round Trip Time: ${roundTripTime} ms`);
		console.log(`Estimated Offset: ${offset} ms`);

		// You can define a threshold for what you consider "synchronized"
		const syncThresholdMs = 1000; // Example: 1 second threshold

		if (Math.abs(offset) <= syncThresholdMs) {
			console.log('Client clock appears to be reasonably synchronized with the server.');
			return { offset: offset, isSynchronized: true };
		} else {
			console.log('Client clock appears to be significantly out of sync with the server.');
			return { offset: offset, isSynchronized: false };
		}
	} catch (error) {
		console.error('Error checking clock synchronization:', error);
		return { offset: null, isSynchronized: false, error: error.message };
	}
}
