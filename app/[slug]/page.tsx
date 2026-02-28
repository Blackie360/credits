import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { RedeemForm } from './redeem-form'

export default async function EventPage ({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1)

  if (!event) {
    notFound()
  }

  return <RedeemForm eventSlug={event.slug} eventName={event.name} />
}
