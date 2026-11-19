import { NextResponse } from 'next/server'

// Temporary deployment diagnostics: reports only whether each variable exists,
// never a value. Used to confirm which commit is live and whether the OAuth
// credentials reached the running deployment.
export const dynamic = 'force-dynamic'

const has = (value: string | undefined) => Boolean(value && value.trim().length > 0)

export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
      NEXTAUTH_SECRET: has(process.env.NEXTAUTH_SECRET),
      GOOGLE_CLIENT_ID: has(process.env.GOOGLE_CLIENT_ID),
      GOOGLE_CLIENT_SECRET: has(process.env.GOOGLE_CLIENT_SECRET),
      GITHUB_CLIENT_ID: has(process.env.GITHUB_CLIENT_ID),
      GITHUB_CLIENT_SECRET: has(process.env.GITHUB_CLIENT_SECRET),
      OAUTH_BRIDGE_SECRET: has(process.env.OAUTH_BRIDGE_SECRET),
      BACKEND_INTERNAL_URL: has(process.env.BACKEND_INTERNAL_URL),
    },
  })
}
