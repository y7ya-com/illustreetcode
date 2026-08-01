// Drizzle schema for Cloudflare D1 (sqlite dialect).
// Progress is keyed per PROBLEM, never per list — lists are views.
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// ---- better-auth core tables (shape per better-auth drizzle adapter) ----
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

// ---- app tables ----
export const progress = sqliteTable(
  'progress',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    problemId: text('problem_id').notNull(),
    status: text('status', { enum: ['solved', 'attempted'] }).notNull().default('solved'),
    solvedAt: integer('solved_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.problemId] })],
)

export const solutions = sqliteTable(
  'solutions',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    problemId: text('problem_id').notNull(),
    code: text('code').notNull(),
    updatedAt: integer('updated_at').notNull(),
    // last-write-wins loser is stashed here, never silently dropped
    stashedCode: text('stashed_code'),
    stashedAt: integer('stashed_at'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.problemId] })],
)
