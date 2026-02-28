'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parse } from 'csv-parse/sync'
import { and, eq, sql } from 'drizzle-orm'
import { validateAdminCredentials, getAdminCookieName, verifyAdminToken } from '@/lib/admin'
import { db } from '@/lib/db'
import { events, allowedEmails, referralCodes } from '@/lib/db/schema'

async function requireAdmin () {
  const cookieStore = await cookies()
  const token = cookieStore.get(getAdminCookieName())?.value
  if (!(await verifyAdminToken(token))) {
    throw new Error('Unauthorized')
  }
}

export async function adminLogin (formData: FormData) {
  const username = (formData.get('username') as string | null)?.trim()
  const password = formData.get('password') as string | null
  const redirectTo = (formData.get('redirectTo') as string) || '/admin'
  if (!username || !password) {
    return { error: 'Please enter username and password.' }
  }
  const token = await validateAdminCredentials(username, password)
  if (!token) {
    return { error: 'Invalid username or password.' }
  }
  const cookieStore = await cookies()
  cookieStore.set(getAdminCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  })
  redirect(redirectTo)
}

export async function adminLogout (formData: FormData) {
  const redirectTo = (formData.get('redirectTo') as string) || '/admin'
  const cookieStore = await cookies()
  cookieStore.delete(getAdminCookieName())
  redirect(redirectTo)
}

function slugify (name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function createEvent (formData: FormData) {
  await requireAdmin()

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) {
    return { error: 'Please enter an event name.' }
  }

  const slug = slugify(name)
  if (!slug) {
    return { error: 'Invalid event name.' }
  }

  const [existing] = await db.select().from(events).where(eq(events.slug, slug)).limit(1)
  if (existing) {
    return { error: `An event with slug "${slug}" already exists.` }
  }

  await db.insert(events).values({ slug, name })
  redirect('/admin')
}

export async function deleteEvent (formData: FormData) {
  await requireAdmin()

  const slug = (formData.get('slug') as string | null)?.trim()
  if (!slug) {
    return { error: 'Invalid event.' }
  }

  await db.transaction(async (tx) => {
    await tx.delete(allowedEmails).where(eq(allowedEmails.eventSlug, slug))
    await tx.delete(referralCodes).where(eq(referralCodes.eventSlug, slug))
    await tx.delete(events).where(eq(events.slug, slug))
  })

  redirect('/admin')
}

function normalizeKey (s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '')
}

function findColumn (row: Record<string, string>, ...candidates: string[]): string | undefined {
  const keys = Object.keys(row)
  for (const candidate of candidates) {
    const target = normalizeKey(candidate)
    const found = keys.find((k) => normalizeKey(k) === target)
    if (found) return row[found]?.trim()
  }
  return undefined
}

function normalizeEmail (email: string): string {
  return email.trim().toLowerCase()
}

function extractEmailsFromRawText (text: string): string[] {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []
  const unique = new Set<string>()
  for (const entry of matches) {
    unique.add(normalizeEmail(entry))
  }
  return Array.from(unique)
}

export async function upsertAllowedEmail (formData: FormData) {
  await requireAdmin()

  const eventSlug = (formData.get('eventSlug') as string | null) ?? ''
  const rawEmail = (formData.get('email') as string | null) ?? ''
  const rawName = (formData.get('name') as string | null) ?? ''
  const email = normalizeEmail(rawEmail)
  const name = rawName.trim()

  if (!eventSlug) {
    return { error: 'Invalid event.' }
  }

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }

  await db.insert(allowedEmails).values({
    email,
    name: name || null,
    eventSlug
  }).onConflictDoUpdate({
    target: [allowedEmails.email, allowedEmails.eventSlug],
    set: { name: sql`excluded.name` }
  })

  return { success: `Saved ${email}` }
}

export async function deleteAllowedEmail (formData: FormData) {
  await requireAdmin()

  const eventSlug = (formData.get('eventSlug') as string | null) ?? ''
  const rawEmail = (formData.get('email') as string | null) ?? ''
  const email = normalizeEmail(rawEmail)

  if (!eventSlug) {
    return { error: 'Invalid event.' }
  }

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }

  await db.delete(allowedEmails).where(
    and(eq(allowedEmails.email, email), eq(allowedEmails.eventSlug, eventSlug))
  )

  return { success: `Removed ${email}` }
}

export async function uploadEmailsCsv (formData: FormData) {
  await requireAdmin()

  const eventSlug = (formData.get('eventSlug') as string | null) ?? ''
  if (!eventSlug) {
    return { error: 'Invalid event.' }
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return { error: 'Please select a CSV file.' }
  }
  if (!file.name.endsWith('.csv')) {
    return { error: 'Only .csv files are supported.' }
  }

  const replace = formData.get('replace') === 'on'

  const text = await file.text()
  let records: Record<string, string>[]
  try {
    records = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true })
  } catch {
    return { error: 'Failed to parse CSV. Make sure it is a valid CSV file.' }
  }

  if (records.length === 0) {
    return { error: 'CSV has no data rows.' }
  }

  const byEmail = new Map<string, string>()
  for (const row of records) {
    const email = (
      findColumn(row, 'email') ??
      findColumn(row, 'e-mail') ??
      findColumn(row, 'email address') ??
      ''
    ).toLowerCase()
    const name = (
      findColumn(row, 'name') ||
      [findColumn(row, 'first_name', 'firstname', 'first name'), findColumn(row, 'last_name', 'lastname', 'last name')]
        .filter(Boolean)
        .join(' ') || ''
    ).replace(/\s+/g, ' ').trim()
    if (email && email.includes('@')) {
      if (!byEmail.has(email)) byEmail.set(email, name)
    }
  }

  if (byEmail.size === 0) {
    const fallbackEmails = extractEmailsFromRawText(text)
    for (const email of fallbackEmails) {
      byEmail.set(email, '')
    }
  }

  if (byEmail.size === 0) {
    return { error: 'No valid emails found. Use a CSV with an "email" column or a plain one-email-per-line file.' }
  }

  const rows = Array.from(byEmail, ([email, name]) => ({ email, name: name || null, eventSlug }))

  if (replace) {
    await db.transaction(async (tx) => {
      await tx.delete(allowedEmails).where(eq(allowedEmails.eventSlug, eventSlug))
      await tx.insert(allowedEmails).values(rows).onConflictDoUpdate({
        target: [allowedEmails.email, allowedEmails.eventSlug],
        set: { name: sql`excluded.name` }
      })
    })
  } else {
    await db.insert(allowedEmails).values(rows).onConflictDoUpdate({
      target: [allowedEmails.email, allowedEmails.eventSlug],
      set: { name: sql`excluded.name` }
    })
  }

  redirect(`/${eventSlug}/admin`)
}

function extractCodesFromText (raw: string): Array<{ code: string; url: string }> {
  const seen = new Set<string>()
  const entries: Array<{ code: string; url: string }> = []

  for (const line of raw.split(/[\n\r]+/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let code = ''
    const urlMatch = trimmed.match(/[?&]code=([A-Za-z0-9._~-]+)/i)
    if (urlMatch) {
      code = urlMatch[1].trim()
    } else if (/^[A-Za-z0-9._~-]+$/.test(trimmed)) {
      code = trimmed
    }

    if (!code || seen.has(code)) continue
    seen.add(code)
    entries.push({ code, url: `https://cursor.com/referral?code=${encodeURIComponent(code)}` })
  }

  return entries
}

export async function uploadCodesCsv (formData: FormData) {
  await requireAdmin()

  const eventSlug = (formData.get('eventSlug') as string | null) ?? ''
  if (!eventSlug) {
    return { error: 'Invalid event.' }
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return { error: 'Please select a CSV file.' }
  }
  if (!file.name.endsWith('.csv')) {
    return { error: 'Only .csv files are supported.' }
  }

  const replace = formData.get('replace') === 'on'
  const text = await file.text()

  const entries: Array<{ code: string; url: string }> = []
  const seen = new Set<string>()

  let records: Record<string, string>[] = []
  try {
    records = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true })
  } catch {
    // not a valid CSV with headers — fall through to raw text extraction
  }

  if (records.length > 0) {
    for (const row of records) {
      const url = findColumn(row, 'url', 'link', 'referral_url', 'referral_link')
      const codeOnly = findColumn(row, 'code', 'code_id', 'referral_code')

      let code = ''

      if (url) {
        const codeMatch = url.match(/[?&]code=([A-Za-z0-9._~-]+)/i)
        code = (codeMatch?.[1] ?? '').trim()
      } else if (codeOnly) {
        code = codeOnly
      }

      if (!code) {
        const values = Object.values(row).map((v) => v?.trim()).filter(Boolean)
        for (const val of values) {
          const m = val.match(/[?&]code=([A-Za-z0-9._~-]+)/i)
          if (m) { code = m[1].trim(); break }
          if (/^[A-Za-z0-9._~-]+$/.test(val) && val.length >= 6) { code = val; break }
        }
      }

      if (!code || seen.has(code)) continue
      seen.add(code)
      entries.push({ code, url: `https://cursor.com/referral?code=${encodeURIComponent(code)}` })
    }
  }

  if (entries.length === 0) {
    const fallback = extractCodesFromText(text)
    entries.push(...fallback)
  }

  if (entries.length === 0) {
    return { error: 'No valid codes found. Upload a CSV with codes, referral URLs, or one code/URL per line.' }
  }

  if (replace) {
    await db.transaction(async (tx) => {
      await tx.delete(referralCodes).where(eq(referralCodes.eventSlug, eventSlug))
      await tx.insert(referralCodes).values(entries.map(({ code, url }) => ({
        code,
        url,
        claimedByEmail: null,
        eventSlug
      }))).onConflictDoNothing()
    })
  } else {
    await db.insert(referralCodes).values(entries.map(({ code, url }) => ({
      code,
      url,
      claimedByEmail: null,
      eventSlug
    }))).onConflictDoNothing()
  }

  redirect(`/${eventSlug}/admin`)
}

export async function pasteCodesRaw (formData: FormData) {
  await requireAdmin()

  const eventSlug = (formData.get('eventSlug') as string | null) ?? ''
  if (!eventSlug) {
    return { error: 'Invalid event.' }
  }

  const raw = (formData.get('codes') as string | null) ?? ''
  if (!raw.trim()) {
    return { error: 'Please paste at least one code or URL.' }
  }

  const replace = formData.get('replace') === 'on'
  const lines = raw.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean)

  const entries: Array<{ code: string; url: string }> = []
  const seen = new Set<string>()

  for (const line of lines) {
    let code = ''

    const urlMatch = line.match(/[?&]code=([A-Za-z0-9._~-]+)/i)
    if (urlMatch) {
      code = urlMatch[1].trim()
    } else {
      code = line.replace(/^https?:\/\//, '').trim()
    }

    if (!code) continue
    if (seen.has(code)) continue
    seen.add(code)
    const resolvedUrl = `https://cursor.com/referral?code=${encodeURIComponent(code)}`
    entries.push({ code, url: resolvedUrl })
  }

  if (entries.length === 0) {
    return { error: 'No valid codes found. Paste one code or URL per line.' }
  }

  if (replace) {
    await db.transaction(async (tx) => {
      await tx.delete(referralCodes).where(eq(referralCodes.eventSlug, eventSlug))
      await tx.insert(referralCodes).values(entries.map(({ code, url }) => ({
        code,
        url,
        claimedByEmail: null,
        eventSlug
      }))).onConflictDoNothing()
    })
  } else {
    await db.insert(referralCodes).values(entries.map(({ code, url }) => ({
      code,
      url,
      claimedByEmail: null,
      eventSlug
    }))).onConflictDoNothing()
  }

  return { success: `Added ${entries.length} code${entries.length === 1 ? '' : 's'}.` }
}
