import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { and, eq, isNull } from 'drizzle-orm'
import { getAdminCookieName, verifyAdminToken } from '@/lib/admin'
import { db } from '@/lib/db'
import { events, referralCodes } from '@/lib/db/schema'
import { adminLogin, adminLogout, createEvent, deleteEvent } from './actions'
import { AdminLoginForm } from './admin-login-form'
import { CreateEventForm } from './create-event-form'
import { DeleteEventButton } from './delete-event-button'

export const dynamic = 'force-dynamic'

export default async function AdminPage () {
  const cookieStore = await cookies()
  const token = cookieStore.get(getAdminCookieName())?.value
  const isAdmin = await verifyAdminToken(token)

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#1a1a1a] px-4 py-16 font-sans text-white">
        <main className="w-full max-w-sm">
          <Image
            src="/CUBE_2D_DARK.png"
            alt="Cursor Kenya"
            width={48}
            height={48}
            className="mx-auto mb-6"
          />
          <h1 className="mb-6 text-center text-xl font-bold text-zinc-100">
            Admin
          </h1>
          <AdminLoginForm action={adminLogin} />
          <p className="mt-6 text-center text-xs text-zinc-500">
            <Link href="/" className="underline hover:text-zinc-400">
              Back to portal
            </Link>
          </p>
        </main>
      </div>
    )
  }

  const allEvents = await db.select().from(events)
  const eventsWithStats = await Promise.all(
    allEvents.map(async (event) => {
      const total = await db.select().from(referralCodes).where(eq(referralCodes.eventSlug, event.slug))
      const available = await db.select().from(referralCodes).where(
        and(eq(referralCodes.eventSlug, event.slug), isNull(referralCodes.claimedByEmail))
      )
      return {
        ...event,
        totalCodes: total.length,
        availableCodes: available.length
      }
    })
  )

  return (
    <div className="min-h-screen bg-[#1a1a1a] px-4 py-12 font-sans text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/CUBE_2D_DARK.png"
              alt="Cursor Kenya"
              width={40}
              height={40}
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                Events Manager
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Create and manage credit disbursement events
              </p>
            </div>
          </div>
          <form action={adminLogout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              Log out
            </button>
          </form>
        </header>

        <CreateEventForm action={createEvent} />

        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-200">Events</h2>
          {eventsWithStats.length === 0 && (
            <p className="text-sm text-zinc-500">No events yet. Create one above.</p>
          )}
          {eventsWithStats.map((event) => (
            <div
              key={event.slug}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-600/60 bg-zinc-800/50 px-5 py-4"
            >
              <div>
                <p className="font-semibold text-zinc-100">{event.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">/{event.slug}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-sm text-zinc-300">
                    <span className="font-medium text-orange-500">{event.availableCodes}</span>
                    <span className="text-zinc-500">/{event.totalCodes}</span>
                  </span>
                  <p className="text-xs text-zinc-500">available</p>
                </div>
                <Link
                  href={`/${event.slug}/admin`}
                  className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                >
                  Manage
                </Link>
                <DeleteEventButton
                  slug={event.slug}
                  name={event.name}
                  action={deleteEvent}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-500">
          <Link href="/" className="underline hover:text-zinc-400">
            Back to portal
          </Link>
        </p>
      </div>
    </div>
  )
}
