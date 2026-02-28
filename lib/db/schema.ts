import { pgTable, text, serial, timestamp, primaryKey, unique } from 'drizzle-orm/pg-core'

export const events = pgTable('events', {
  slug: text('slug').primaryKey().notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const allowedEmails = pgTable('allowed_emails', {
  email: text('email').notNull(),
  name: text('name'),
  eventSlug: text('event_slug').notNull()
}, (t) => [
  primaryKey({ columns: [t.email, t.eventSlug] })
])

export const referralCodes = pgTable('referral_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(),
  url: text('url').notNull(),
  claimedByEmail: text('claimed_by_email'),
  eventSlug: text('event_slug').notNull()
}, (t) => [
  unique().on(t.code, t.eventSlug)
])

export const adminUsers = pgTable('admin_users', {
  username: text('username').primaryKey().notNull(),
  passwordHash: text('password_hash').notNull()
})
