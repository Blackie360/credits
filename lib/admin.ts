import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUsers } from '@/lib/db/schema'

const ADMIN_COOKIE = 'admin_session'
const TOKEN_LENGTH = 32
const PASSWORD_KEY_LENGTH = 64

function safeEqual (a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

function getToken (username: string, password: string): string {
  return createHash('sha256')
    .update(`${username}:${password}`)
    .digest('hex')
    .slice(0, TOKEN_LENGTH)
}

function parsePasswordHash (storedValue: string): { salt: string, hash: string } | null {
  const [salt, hash] = storedValue.split(':')
  if (!salt || !hash) return null
  return { salt, hash }
}

function hashPasswordWithSalt (password: string, salt: string): string {
  return scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex')
}

export function createAdminPasswordHash (password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = hashPasswordWithSalt(password, salt)
  return `${salt}:${hash}`
}

function verifyPasswordHash (password: string, storedValue: string): boolean {
  const parsed = parsePasswordHash(storedValue)
  if (!parsed) return false
  const inputHash = hashPasswordWithSalt(password, parsed.salt)
  try {
    return timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(parsed.hash, 'hex'))
  } catch {
    return false
  }
}

export async function verifyAdminToken (token: string | undefined): Promise<boolean> {
  if (!token) return false
  const [username, userToken] = token.split(':')
  if (!username || !userToken || userToken.length !== TOKEN_LENGTH) return false

  const envAdminUsername = process.env.ADMIN_USERNAME?.trim()
  const envAdminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim()
  const envAdminPassword = process.env.ADMIN_PASSWORD
  const envAdminSecret = envAdminPasswordHash ?? envAdminPassword
  if (envAdminUsername && envAdminSecret && safeEqual(username, envAdminUsername)) {
    const expected = getToken(username, envAdminSecret)
    try {
      return timingSafeEqual(Buffer.from(userToken, 'hex'), Buffer.from(expected, 'hex'))
    } catch {
      return false
    }
  }

  let user: { username: string, passwordHash: string } | undefined
  try {
    ;[user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1)
  } catch {
    return false
  }
  if (!user) return false

  const expected = getToken(username, user.passwordHash)
  try {
    return timingSafeEqual(Buffer.from(userToken, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

export async function validateAdminCredentials (username: string, password: string): Promise<string | null> {
  const envAdminUsername = process.env.ADMIN_USERNAME?.trim()
  const envAdminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim()
  const envAdminPassword = process.env.ADMIN_PASSWORD

  if (envAdminUsername && safeEqual(username, envAdminUsername)) {
    if (envAdminPasswordHash && verifyPasswordHash(password, envAdminPasswordHash)) {
      return `${username}:${getToken(username, envAdminPasswordHash)}`
    }
    if (envAdminPassword && safeEqual(password, envAdminPassword)) {
      return `${username}:${getToken(username, envAdminPassword)}`
    }
  }

  let user: { username: string, passwordHash: string } | undefined
  try {
    ;[user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1)
  } catch {
    return null
  }
  if (!user) return null
  if (!safeEqual(username, user.username)) return null
  if (!verifyPasswordHash(password, user.passwordHash)) return null
  return `${username}:${getToken(username, user.passwordHash)}`
}

export function getAdminCookieName (): string {
  return ADMIN_COOKIE
}
