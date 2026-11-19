import { NextResponse } from 'next/server'

/**
 * Temporary, read-only OAuth diagnostics.
 *
 * It tries a token exchange with an intentionally invalid code. The provider
 * then answers with a *reason*:
 *   - "bad_verification_code" / "invalid_grant" => client id + secret are a
 *     valid pair, so the failure is elsewhere (state cookie, redirect URI...).
 *   - "incorrect_client_credentials" / "invalid_client" => the secret stored on
 *     this deployment does not belong to this client id. That is the bug.
 *
 * Nothing secret is returned: only the provider's error code and short message.
 */
export const dynamic = 'force-dynamic'

const callbackBase = process.env.NEXTAUTH_URL || 'https://team-pulse-lilac.vercel.app'

type ProbeResult = {
  status: number
  error: string | null
  description: string | null
}

async function probeGitHub(): Promise<ProbeResult> {
  const body = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID ?? '',
    client_secret: process.env.GITHUB_CLIENT_SECRET ?? '',
    code: 'teampulse-diagnostic-invalid-code',
    redirect_uri: `${callbackBase}/api/auth/callback/github`,
  })
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
  return {
    status: response.status,
    error: typeof payload?.error === 'string' ? payload.error : null,
    description:
      typeof payload?.error_description === 'string' ? payload.error_description : null,
  }
}

async function probeGoogle(): Promise<ProbeResult> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    code: 'teampulse-diagnostic-invalid-code',
    grant_type: 'authorization_code',
    redirect_uri: `${callbackBase}/api/auth/callback/google`,
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
  return {
    status: response.status,
    error: typeof payload?.error === 'string' ? payload.error : null,
    description:
      typeof payload?.error_description === 'string' ? payload.error_description : null,
  }
}

export async function GET() {
  const [github, google] = await Promise.all([
    probeGitHub().catch((error: unknown) => ({
      status: 0,
      error: 'probe_failed',
      description: error instanceof Error ? error.message : String(error),
    })),
    probeGoogle().catch((error: unknown) => ({
      status: 0,
      error: 'probe_failed',
      description: error instanceof Error ? error.message : String(error),
    })),
  ])

  return NextResponse.json({ callbackBase, github, google })
}
