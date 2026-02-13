import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminCookieName, verifyAdminToken } from '@/lib/admin'
import { db } from '@/lib/db'
import { referralCodes, allowedEmails } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export async function GET () {
  const cookieStore = await cookies()
  const token = cookieStore.get(getAdminCookieName())?.value
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [codes, emails] = await Promise.all([
      db
        .select({
          id: referralCodes.id,
          code: referralCodes.code,
          claimedByEmail: referralCodes.claimedByEmail
        })
        .from(referralCodes)
        .orderBy(desc(referralCodes.id)),
      db
        .select({
          email: allowedEmails.email,
          name: allowedEmails.name
        })
        .from(allowedEmails)
    ])

    const redeemed = codes.filter((r) => r.claimedByEmail !== null)
    const available = codes.filter((r) => r.claimedByEmail === null)

    return NextResponse.json({
      summary: {
        total: codes.length,
        redeemed: redeemed.length,
        available: available.length,
        allowedEmails: emails.length
      },
      codes: codes.map((r) => ({
        id: r.id,
        code: r.code,
        status: r.claimedByEmail ? 'redeemed' as const : 'available' as const,
        claimedByEmail: r.claimedByEmail ?? null
      })),
      emails
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
