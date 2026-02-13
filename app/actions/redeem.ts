'use server'

import { eq, isNull } from 'drizzle-orm'
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
  const email = normalizeEmail(rawEmail)

  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  const [allowed] = await db
    .select()
    .from(allowedEmails)
    .where(eq(allowedEmails.email, email))
    .limit(1)

  if (!allowed) {
    return { success: false, error: 'This email is not eligible for a code.' }
  }

  const [alreadyClaimed] = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.claimedByEmail, email))
    .limit(1)

  if (alreadyClaimed) {
    return { success: false, error: 'You have already redeemed a code.' }
  }

  const [unclaimed] = await db
    .select()
    .from(referralCodes)
    .where(isNull(referralCodes.claimedByEmail))
    .limit(1)

  if (!unclaimed) {
    return { success: false, error: 'No codes available at the moment.' }
  }

  await db
    .update(referralCodes)
    .set({ claimedByEmail: email })
    .where(eq(referralCodes.id, unclaimed.id))

  try {
    await sendRedemptionEmail(email, allowed.name, unclaimed.code, unclaimed.url)
  } catch (err) {
    console.error('Failed to send redemption email:', err)
  }

  return {
    success: true,
    code: unclaimed.code,
    url: unclaimed.url
  }
}

export type CodeCounts = { available: number; total: number }

export async function getCodeCounts (): Promise<CodeCounts> {
  const all = await db.select().from(referralCodes)
  const unclaimed = await db.select().from(referralCodes).where(isNull(referralCodes.claimedByEmail))
  return { total: all.length, available: unclaimed.length }
}
