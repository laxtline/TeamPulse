import { handlers } from '@/lib/auth'

// The OAuth callback exchanges the provider code and then calls the API, which
// runs on a free Render instance that spins down when idle. A cold start takes
// ~50s, far longer than the default 10s function budget, and the login would
// fail with a generic error, so give the handler room to wait it out.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export const { GET, POST } = handlers
