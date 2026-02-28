import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { getAdminCookieName, verifyAdminToken } from '@/lib/admin'
import {
  adminLogin,
  adminLogout,
  uploadEmailsCsv,
  uploadCodesCsv,
  upsertAllowedEmail,
  deleteAllowedEmail,
  pasteCodesRaw
} from '../../admin/actions'
import { AdminAnalytics } from '../../admin/admin-analytics'
import { AdminLoginForm } from '../../admin/admin-login-form'
import { EmailManager } from '../../admin/email-manager'
import { AdminQueryProvider } from '../../admin/query-provider'
import { CsvUpload } from '../../admin/csv-upload'
import { PasteCodes } from '../../admin/paste-codes'

export default async function EventAdminPage ({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1)

  if (!event) {
    notFound()
  }

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
            Admin — {event.name}
          </h1>
          <AdminLoginForm action={adminLogin} redirectTo={`/${slug}/admin`} />
          <p className="mt-6 text-center text-xs text-zinc-500">
            <Link href={`/${slug}`} className="underline hover:text-zinc-400">
              Back to event
            </Link>
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] px-4 py-12 font-sans text-white">
      <div className="mx-auto max-w-5xl">
        <AdminQueryProvider>
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
                  {event.name}
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Manage codes, emails, and CSV uploads
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PasteCodes action={pasteCodesRaw} eventSlug={slug} />
              <form action={adminLogout}>
                <input type="hidden" name="redirectTo" value={`/${slug}/admin`} />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                >
                  Log out
                </button>
              </form>
            </div>
          </header>

          <div className="space-y-8">
            <EmailManager
              upsertAction={upsertAllowedEmail}
              deleteAction={deleteAllowedEmail}
              eventSlug={slug}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CsvUpload
                action={uploadEmailsCsv}
                label="Bulk Upload Emails"
                hint="Columns: email, name (or one email per line)."
                eventSlug={slug}
              />
              <CsvUpload
                action={uploadCodesCsv}
                label="Bulk Upload Codes (CSV)"
                hint="Auto-detects codes, URLs, or CSV with code/url columns."
                eventSlug={slug}
              />
            </div>
            <AdminAnalytics eventSlug={slug} />
          </div>
        </AdminQueryProvider>

        <div className="mt-8 flex justify-center gap-4 text-xs text-zinc-500">
          <Link href={`/${slug}`} className="underline hover:text-zinc-400">
            Back to event
          </Link>
          <Link href="/admin" className="underline hover:text-zinc-400">
            All events
          </Link>
        </div>
      </div>
    </div>
  )
}
