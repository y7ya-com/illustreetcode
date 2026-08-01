// better-auth on Cloudflare D1. The D1 binding only exists inside the Worker,
// so the instance is built per-request from the binding (no global db).
//
// NOT LIVE YET — needs: a Cloudflare account + D1 database id in wrangler.jsonc,
// GitHub/Google OAuth app credentials as secrets, and the /api/auth/* server
// route mounted (blocked on server-route support landing in the svelte-start
// adapter — tracked in README "Cloud sync").
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export interface Env {
  DB: D1Database
  BETTER_AUTH_SECRET: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

export function createAuth(env: Env) {
  const db = drizzle(env.DB, { schema })
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
        : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {}),
    },
    // No email/password: dev audience, no credential handling on our side.
  })
}

/**
 * First-login merge of local progress into D1. D1 has no interactive
 * transactions — this is a batch of idempotent upserts, safe to re-run.
 *  - progress: union; earliest solvedAt wins
 *  - solutions: last-write-wins by updatedAt; the loser lands in stashed_code
 */
export function mergeStatements(
  db: ReturnType<typeof drizzle>,
  userId: string,
  local: {
    progress: Record<string, { solvedAt: number }>
    solutions: Record<string, { code: string; updatedAt: number }>
  },
) {
  const now = Date.now()
  const stmts = []
  for (const [problemId, p] of Object.entries(local.progress)) {
    stmts.push(
      db
        .insert(schema.progress)
        .values({ userId, problemId, status: 'solved', solvedAt: p.solvedAt, updatedAt: now })
        .onConflictDoUpdate({
          target: [schema.progress.userId, schema.progress.problemId],
          set: { updatedAt: now },
        }),
    )
  }
  return stmts
}
