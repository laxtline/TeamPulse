import { handlers } from '@/lib/auth'
import type { NextRequest } from 'next/server'

// The OAuth callback exchanges the provider code and then calls the API, which
// runs on a free Render instance that spins down when idle. A cold start takes
// ~50s, far longer than the default 10s function budget, and the login would
// fail with a generic error, so give the handler room to wait it out.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Temporary: Auth.js reports every callback failure as a generic
 * "Configuration" error. The logger in lib/auth.ts records the real exception;
 * here we forward it to the API so it can be read without dashboard access.
 */
const DIAG_URL = `${process.env.NEXT_PUBLIC_API_URL || 'https://teampulse-api-ep2v.onrender.com'}/api/v1/diagnostics/auth-error`
const DIAG_KEY = 'teampulse-diag-2026'

type AuthErrorSlot = { __teampulseAuthError?: Record<string, unknown> }

async function sendDiagnostics(path: string, error: Record<string, unknown>) {
  try {
    await fetch(DIAG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Diag-Key': DIAG_KEY,
      },
      body: JSON.stringify({ source: path, ...error }),
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
  } catch {
    // Diagnostics must never break the sign-in flow.
  }
}

function withDiagnostics(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    const slot = globalThis as AuthErrorSlot
    slot.__teampulseAuthError = undefined

    const response = await handler(request)

    const error = slot.__teampulseAuthError
    if (error) {
      slot.__teampulseAuthError = undefined
      await sendDiagnostics(request.nextUrl.pathname, error)
    }

    return response
  }
}

export const GET = withDiagnostics(handlers.GET)
export const POST = withDiagnostics(handlers.POST)
