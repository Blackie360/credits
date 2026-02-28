import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { eq, desc } from 'drizzle-orm'
import { getAdminCookieName, verifyAdminToken } from '@/lib/admin'
import { db } from '@/lib/db'
import { referralCodes, allowedEmails } from '@/lib/db/schema'

type AnalyticsPayload = {
  summary: {
    total: number
    redeemed: number
    available: number
    allowedEmails: number
  }
  codes: Array<{
    id: number
    code: string
    url: string
    status: 'redeemed' | 'available'
    claimedByEmail: string | null
  }>
  emails: Array<{
    email: string
    name: string | null
  }>
}

export async function GET (request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(getAdminCookieName())?.value
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 })
  }

  try {
    const [codes, emails] = await Promise.all([
      db
        .select({
          id: referralCodes.id,
          code: referralCodes.code,
          url: referralCodes.url,
          claimedByEmail: referralCodes.claimedByEmail
        })
        .from(referralCodes)
        .where(eq(referralCodes.eventSlug, slug))
        .orderBy(desc(referralCodes.id)),
      db
        .select({
          email: allowedEmails.email,
          name: allowedEmails.name
        })
        .from(allowedEmails)
        .where(eq(allowedEmails.eventSlug, slug))
    ])

    const redeemed = codes.filter((r) => r.claimedByEmail !== null)
    const available = codes.filter((r) => r.claimedByEmail === null)

    const payload: AnalyticsPayload = {
      summary: {
        total: codes.length,
        redeemed: redeemed.length,
        available: available.length,
        allowedEmails: emails.length
      },
      codes: codes.map((r) => ({
        id: r.id,
        code: r.code,
        url: `https://cursor.com/referral?code=${encodeURIComponent(r.code)}`,
        status: r.claimedByEmail ? 'redeemed' as const : 'available' as const,
        claimedByEmail: r.claimedByEmail ?? null
      })),
      emails
    }

    return NextResponse.json(payload)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
