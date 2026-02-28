import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminCookieName, verifyAdminToken } from '@/lib/admin'
import { verifySmtpConnection, sendRedemptionEmail } from '@/lib/email'

export async function GET () {
  const cookieStore = await cookies()
  const token = cookieStore.get(getAdminCookieName())?.value
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const ok = await verifySmtpConnection()
    return NextResponse.json({ smtp: ok ? 'connected' : 'failed' })
  } catch (err) {
    return NextResponse.json(
      { smtp: 'failed', error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST (request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(getAdminCookieName())?.value
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const to = typeof body.to === 'string' ? body.to.trim() : ''

  if (!to || !to.includes('@')) {
    return NextResponse.json(
      { error: 'Provide a valid "to" email address in the JSON body.' },
      { status: 400 }
    )
  }

  try {
    await sendRedemptionEmail(to, 'Test User', 'TESTCODE123', 'https://cursor.com/referral?code=TESTCODE123')
    return NextResponse.json({ sent: true, to })
  } catch (err) {
    return NextResponse.json(
      { sent: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
