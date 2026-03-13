import Image from 'next/image'
import Link from 'next/link'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events, referralCodes } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function Home () {
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1a1a1a] px-4 py-16 font-sans text-white">
      <main className="flex w-full max-w-lg flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/CUBE_2D_DARK.png"
            alt="Cursor Kenya"
            width={56}
            height={56}
            className="mx-auto"
          />
          <h1
            className="text-center text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-geist-pixel-square)' }}
          >
            Cursor Kenya — Code Redeemable
          </h1>
          <p className="text-center text-sm font-normal text-zinc-400">
            Select an event to redeem your Cursor Kenya code
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          {eventsWithStats.length === 0 && (
            <p className="text-center text-zinc-500">No events available yet.</p>
          )}
          {eventsWithStats.map((event) => (
            <Link
              key={event.slug}
              href={`/${event.slug}`}
              className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 px-5 py-4 transition-colors hover:border-orange-500/60 hover:bg-zinc-800"
            >
              <p className="font-semibold text-zinc-100">{event.name}</p>
              <p className="mt-0.5 text-xs text-zinc-500">/{event.slug}</p>
            </Link>
          ))}
        </div>


      </main>
    </div>
  )
}
