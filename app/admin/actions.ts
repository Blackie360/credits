'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parse } from 'csv-parse/sync'
import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { validateAdminCredentials, getAdminCookieName, verifyAdminToken } from '@/lib/admin'
import { POOL_SLUG } from '@/lib/pool'
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

  if (slug === POOL_SLUG) {
    return { error: 'This event name is reserved.' }
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

  if (slug === POOL_SLUG) {
    return { error: 'Cannot delete the pool.' }
  }

  // Neon HTTP driver does not support transactions — run deletes sequentially
  await db.delete(allowedEmails).where(eq(allowedEmails.eventSlug, slug))
  await db.delete(referralCodes).where(eq(referralCodes.eventSlug, slug))
  await db.delete(events).where(eq(events.slug, slug))

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
    // Neon HTTP driver does not support transactions — run sequentially
    await db.delete(allowedEmails).where(eq(allowedEmails.eventSlug, eventSlug))
    await db.insert(allowedEmails).values(rows).onConflictDoUpdate({
      target: [allowedEmails.email, allowedEmails.eventSlug],
      set: { name: sql`excluded.name` }
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
    // Neon HTTP driver does not support transactions — run sequentially
    await db.delete(referralCodes).where(eq(referralCodes.eventSlug, eventSlug))
    await db.insert(referralCodes).values(entries.map(({ code, url }) => ({
      code,
      url,
      claimedByEmail: null,
      eventSlug
    }))).onConflictDoNothing()
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
    // Neon HTTP driver does not support transactions — run sequentially
    await db.delete(referralCodes).where(eq(referralCodes.eventSlug, eventSlug))
    await db.insert(referralCodes).values(entries.map(({ code, url }) => ({
      code,
      url,
      claimedByEmail: null,
      eventSlug
    }))).onConflictDoNothing()
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

export async function pasteCodesToPool (formData: FormData) {
  await requireAdmin()

  const raw = (formData.get('codes') as string | null) ?? ''
  if (!raw.trim()) {
    return { error: 'Please paste at least one code or URL.' }
  }

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
    entries.push({ code, url: `https://cursor.com/referral?code=${encodeURIComponent(code)}` })
  }

  if (entries.length === 0) {
    return { error: 'No valid codes found. Paste one code or URL per line.' }
  }

  await db.insert(referralCodes).values(entries.map(({ code, url }) => ({
    code,
    url,
    claimedByEmail: null,
    eventSlug: POOL_SLUG
  }))).onConflictDoNothing()

  return { success: `Added ${entries.length} code${entries.length === 1 ? '' : 's'} to pool.` }
}

export async function uploadCodesToPool (formData: FormData) {
  await requireAdmin()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return { error: 'Please select a CSV file.' }
  }
  if (!file.name.endsWith('.csv')) {
    return { error: 'Only .csv files are supported.' }
  }

  const text = await file.text()
  const entries: Array<{ code: string; url: string }> = []
  const seen = new Set<string>()

  let records: Record<string, string>[] = []
  try {
    records = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true })
  } catch {
    // not a valid CSV — fall through to raw text extraction
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

  await db.insert(referralCodes).values(entries.map(({ code, url }) => ({
    code,
    url,
    claimedByEmail: null,
    eventSlug: POOL_SLUG
  }))).onConflictDoNothing()

  return { success: `Added ${entries.length} code${entries.length === 1 ? '' : 's'} to pool.` }
}

export async function syncUnclaimedToPool () {
  await requireAdmin()

  const unclaimedInEvents = await db
    .select({ id: referralCodes.id, code: referralCodes.code })
    .from(referralCodes)
    .where(
      and(ne(referralCodes.eventSlug, POOL_SLUG), isNull(referralCodes.claimedByEmail))
    )

  const poolCodes = await db
    .select({ code: referralCodes.code })
    .from(referralCodes)
    .where(eq(referralCodes.eventSlug, POOL_SLUG))

  const poolCodeSet = new Set(poolCodes.map((r) => r.code))
  const toMove = unclaimedInEvents.filter((r) => !poolCodeSet.has(r.code))
  const toDelete = unclaimedInEvents.filter((r) => poolCodeSet.has(r.code))

  for (const row of toMove) {
    await db
      .update(referralCodes)
      .set({ eventSlug: POOL_SLUG })
      .where(eq(referralCodes.id, row.id))
    poolCodeSet.add(row.code)
  }

  for (const row of toDelete) {
    await db.delete(referralCodes).where(eq(referralCodes.id, row.id))
  }

  const moved = toMove.length
  const removed = toDelete.length
  if (moved > 0 || removed > 0) {
    return { synced: moved + removed }
  }
  return {}
}

export async function assignBatchToEvent (formData: FormData) {
  await requireAdmin()

  const targetEventSlug = (formData.get('targetEventSlug') as string | null)?.trim()
  const idStrings = formData.getAll('ids') as string[]

  if (!targetEventSlug) {
    return { error: 'Please select an event.' }
  }

  if (targetEventSlug === POOL_SLUG) {
    return { error: 'Cannot assign to the pool.' }
  }

  const [targetEvent] = await db.select().from(events).where(eq(events.slug, targetEventSlug)).limit(1)
  if (!targetEvent) {
    return { error: 'Target event not found.' }
  }

  const ids = idStrings
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n > 0)

  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length < 5 || uniqueIds.length > 50) {
    return { error: 'Select between 5 and 50 codes to assign.' }
  }

  const poolCodesForIds = await db.select().from(referralCodes).where(
    and(eq(referralCodes.eventSlug, POOL_SLUG), inArray(referralCodes.id, uniqueIds))
  )

  if (poolCodesForIds.length !== uniqueIds.length) {
    return { error: 'Some selected codes are not in the pool.' }
  }

  const existingCodesInEvent = await db.select({ code: referralCodes.code }).from(referralCodes).where(
    eq(referralCodes.eventSlug, targetEventSlug)
  )
  const existingSet = new Set(existingCodesInEvent.map((r) => r.code))
  const toAssign = poolCodesForIds.filter((r) => !existingSet.has(r.code))

  if (toAssign.length === 0) {
    return { error: 'All selected codes already exist in that event.' }
  }

  const toAssignIds = toAssign.map((r) => r.id)
  await db.update(referralCodes)
    .set({ eventSlug: targetEventSlug })
    .where(and(eq(referralCodes.eventSlug, POOL_SLUG), inArray(referralCodes.id, toAssignIds)))

  const verified = await db.select({ id: referralCodes.id }).from(referralCodes).where(
    and(eq(referralCodes.eventSlug, targetEventSlug), inArray(referralCodes.id, toAssignIds))
  )
  const assignedCount = verified.length

  if (assignedCount !== toAssignIds.length) {
    return { error: `Assignment verification failed: expected ${toAssignIds.length} codes in event, found ${assignedCount}. Please try again.` }
  }

  const skipped = uniqueIds.length - toAssign.length
  const msg = skipped > 0
    ? `Assigned ${assignedCount} code${assignedCount === 1 ? '' : 's'} to ${targetEvent.name}. ${skipped} skipped (already in event).`
    : `Assigned ${assignedCount} code${assignedCount === 1 ? '' : 's'} to ${targetEvent.name}.`

  return { success: msg }
}
