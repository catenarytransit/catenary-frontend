export function timezone_to_locale(input_lang: string, timezone: string): string {
	if (input_lang.startsWith('en')) {
		if (input_lang.includes('Canada')) {
			return 'en-CA';
		}

		switch (timezone) {
			case 'America/Los_Angeles':
				return 'en-US';
			case 'America/New_York':
				return 'en-US';
			case 'America/Chicago':
				return 'en-US';
			case 'America/Denver':
				return 'en-US';
			case 'America/Vancouver':
				return 'en-CA';
			case 'America/Edmonton':
				return 'en-CA';
			case 'America/Toronto':
				return 'en-CA';
			case 'America/Montreal':
				return 'en-CA';
			case 'America/Halifax':
				return 'en-CA';
			case 'Europe/London':
				return 'en-UK';
			case 'Australia/Sydney':
				return 'en-AU';
			case 'Australia/Adelaide':
				return 'en-AU';
			case 'Australia/Brisbane':
				return 'en-AU';
			case 'Australia/Melbourne':
				return 'en-AU';
			case 'Pacific/Auckland':
				return 'en-NZ';
			case 'Europe/Dublin':
				return 'en-IE';
			default:
				return 'en-UK';
		}
	} else if (input_lang.startsWith('fr')) {
		if (input_lang.includes('Canada')) {
			return 'fr-CA';
		}

		switch (timezone) {
			case 'America/Montreal':
				return 'fr-CA';
			case 'America/Edmonton':
				return 'fr-CA';
			case 'America/Toronto':
				return 'fr-CA';
			case 'America/Halifax':
				return 'fr-CA';
			default:
				return input_lang;
		}
	} else {
		return input_lang;
	}
}
