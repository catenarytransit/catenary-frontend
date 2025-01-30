import { init } from '@jill64/sentry-sveltekit-cloudflare/server'
// or
// import { serverInit } from '@jill64/sentry-sveltekit-cloudflare'

const { onHandle, onError } = init(
    'https://fbd55168ab59964cd223ca010f7b5e02@o4508730818166784.ingest.de.sentry.io/4508730819739728'
    ,
    {
        //   toucanOptions: {
        //     // ... Other Sentry Config
        //   },
        toucanOptions: {
            tracesSampleRate: 1.0,
        }
        //   handleOptions: {
        //     handleUnknownRoutes: boolean (default: false)
        //   },
        //   enableInDevMode: boolean (default: false)
    }
)

export const handle = onHandle(({ event, resolve }) => {
    // Your Handle Code
})

export const handleError = onError((e, sentryEventId) => {
    // Your Error Handler
})
