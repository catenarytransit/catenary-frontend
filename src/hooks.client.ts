import { handleErrorWithSentry, replayIntegration } from '@sentry/sveltekit';
//import * as Sentry from '@sentry/sveltekit';

import {init} from '@jill64/sentry-sveltekit-cloudflare/client';

init(
	'https://fbd55168ab59964cd223ca010f7b5e02@o4508730818166784.ingest.de.sentry.io/4508730819739728',
{
	"sentryOptions": {
		
	tracesSampleRate: 1.0,

	// This sets the sample rate to be 10%. You may want this to be 100% while
	// in development and sample at a lower rate in production
	replaysSessionSampleRate: 1.0,

	// If the entire session is not sampled, use the below sample rate to sample
	// sessions when an error occurs.
	replaysOnErrorSampleRate: 1.0,

	// If you don't want to use Session Replay, just remove the line below:
	integrations: [replayIntegration({
		maskAllText: false,
		blockAllMedia: false,
		maskInputs: false,
	})]
	}
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
