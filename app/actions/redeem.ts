'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { allowedEmails, referralCodes } from '@/lib/db/schema'
import { sendRedemptionEmail } from '@/lib/email'

function normalizeEmail (email: string): string {
  return email.trim().toLowerCase()
}

export type RedeemResult =
  | { success: true; code: string; url: string }
  | { success: false; error: string }

export async function redeemCode (
  _prev: RedeemResult | null,
  formData: FormData
): Promise<RedeemResult> {
  const rawEmail = (formData.get('email') as string) ?? ''
  const eventSlug = (formData.get('eventSlug') as string) ?? ''
  const email = normalizeEmail(rawEmail)

  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  if (!eventSlug) {
    return { success: false, error: 'Invalid event.' }
  }

  const [allowed] = await db
    .select()
    .from(allowedEmails)
    .where(and(eq(allowedEmails.email, email), eq(allowedEmails.eventSlug, eventSlug)))
    .limit(1)

  if (!allowed) {
    return { success: false, error: 'This email is not eligible for a code.' }
  }

  const [alreadyClaimed] = await db
    .select()
    .from(referralCodes)
    .where(and(eq(referralCodes.claimedByEmail, email), eq(referralCodes.eventSlug, eventSlug)))
    .limit(1)

  if (alreadyClaimed) {
    return { success: false, error: 'You have already redeemed a code.' }
  }

  const MAX_RETRIES = 3
  let claimed: typeof referralCodes.$inferSelect | undefined

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const [unclaimed] = await db
      .select()
      .from(referralCodes)
      .where(and(isNull(referralCodes.claimedByEmail), eq(referralCodes.eventSlug, eventSlug)))
      .limit(1)

    if (!unclaimed) {
      return { success: false, error: 'No codes available at the moment.' }
    }

    try {
      const [result] = await db
        .update(referralCodes)
        .set({ claimedByEmail: email })
        .where(and(eq(referralCodes.id, unclaimed.id), isNull(referralCodes.claimedByEmail)))
        .returning()

      if (result) {
        claimed = result
        break
      }
    } catch (err: unknown) {
      const isUniqueViolation =
        err instanceof Error && err.message.includes('unique_claim_per_event')
      if (isUniqueViolation) {
        return { success: false, error: 'You have already redeemed a code.' }
      }
      throw err
    }
  }

  if (!claimed) {
    return { success: false, error: 'No codes available at the moment.' }
  }

  try {
    await sendRedemptionEmail(email, allowed.name, claimed.code, claimed.url)
  } catch (err) {
    console.error('Failed to send redemption email', {
      email,
      name: allowed.name,
      code: claimed.code,
      url: claimed.url,
      error: err
    })
  }

  return {
    success: true,
    code: claimed.code,
    url: claimed.url
  }
}

export type CodeCounts = { available: number; total: number }

export async function getCodeCounts (eventSlug: string): Promise<CodeCounts> {
  const all = await db.select().from(referralCodes).where(eq(referralCodes.eventSlug, eventSlug))
  const unclaimed = await db.select().from(referralCodes).where(
    and(isNull(referralCodes.claimedByEmail), eq(referralCodes.eventSlug, eventSlug))
  )
  return { total: all.length, available: unclaimed.length }
}
