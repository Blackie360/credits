import path from 'node:path'
import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

config({ path: path.resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.DATABASE_URL!)

async function migrate () {
  console.log('Creating events table...')
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      slug TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `

  console.log('Inserting default event...')
  await sql`
    INSERT INTO events (slug, name)
    VALUES ('cursor-ke-pwani', 'Cursor KE Pwani')
    ON CONFLICT DO NOTHING
  `

  console.log('Adding event_slug to allowed_emails...')
  await sql`ALTER TABLE allowed_emails ADD COLUMN IF NOT EXISTS event_slug TEXT`
  await sql`UPDATE allowed_emails SET event_slug = 'cursor-ke-pwani' WHERE event_slug IS NULL`
  await sql`ALTER TABLE allowed_emails ALTER COLUMN event_slug SET NOT NULL`

  console.log('Changing allowed_emails PK to composite (email, event_slug)...')
  await sql`ALTER TABLE allowed_emails DROP CONSTRAINT IF EXISTS allowed_emails_pkey`
  await sql`ALTER TABLE allowed_emails ADD PRIMARY KEY (email, event_slug)`

  console.log('Adding event_slug to referral_codes...')
  await sql`ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS event_slug TEXT`
  await sql`UPDATE referral_codes SET event_slug = 'cursor-ke-pwani' WHERE event_slug IS NULL`
  await sql`ALTER TABLE referral_codes ALTER COLUMN event_slug SET NOT NULL`

  console.log('Migration complete!')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
