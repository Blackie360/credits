#!/usr/bin/env npx tsx
/**
 * Creates or updates admin credentials in .env.local.
 * Usage: pnpm create-admin [username] [password]
 * Default: username=blackie, password=@Gamer360
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ENV_PATH = resolve(process.cwd(), '.env.local')
const DEFAULT_USERNAME = 'blackie'
const DEFAULT_PASSWORD = '@Gamer360'

function escapeEnv (value: string): string {
  if (/[\s#"'\$\\]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return value
}

function main () {
  const username = process.argv[2] ?? DEFAULT_USERNAME
  const password = process.argv[3] ?? DEFAULT_PASSWORD

  let lines: string[] = []
  const updates: Record<string, string> = {
    ADMIN_USERNAME: username,
    ADMIN_PASSWORD: password
  }

  if (existsSync(ENV_PATH)) {
    const content = readFileSync(ENV_PATH, 'utf-8')
    const seen = new Set<string>()
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (match) {
        const key = match[1]
        if (updates[key] !== undefined) {
          lines.push(`${key}=${escapeEnv(updates[key])}`)
          seen.add(key)
        } else {
          lines.push(line)
        }
      } else {
        lines.push(line)
      }
    }
    for (const [key, value] of Object.entries(updates)) {
      if (!lines.some((l) => l.startsWith(`${key}=`))) {
        lines.push(`${key}=${escapeEnv(value)}`)
      }
    }
  } else {
    lines = Object.entries(updates).map(
      ([key, value]) => `${key}=${escapeEnv(value)}`
    )
  }

  writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf-8')
  console.log(`Admin credentials written to .env.local`)
  console.log(`  ADMIN_USERNAME=${username}`)
  console.log(`  ADMIN_PASSWORD=${'*'.repeat(password.length)}`)
}

main()
