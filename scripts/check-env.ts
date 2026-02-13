#!/usr/bin/env npx tsx
/**
 * Validates required env vars exist. Run after pnpm env:pull to verify sync.
 * Usage: pnpm check-env
 */

import { config } from 'dotenv'

config({ path: '.env.local' })

const REQUIRED = [
  'DATABASE_URL',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD'
] as const

const OPTIONAL = [
  'EMAIL_FROM',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_SECURE'
] as const

function main () {
  const missing = REQUIRED.filter((k) => !process.env[k])
  const present = REQUIRED.filter((k) => process.env[k])

  if (missing.length > 0) {
    console.error('Missing required env vars:', missing.join(', '))
    console.error('Run: pnpm env:pull  (to sync from Vercel)')
    process.exit(1)
  }

  console.log('Required env vars OK:', present.join(', '))
  const optPresent = OPTIONAL.filter((k) => process.env[k])
  if (optPresent.length < OPTIONAL.length) {
    console.log('Optional (for email):', OPTIONAL.filter((k) => !process.env[k]).join(', '))
  }
}

main()
