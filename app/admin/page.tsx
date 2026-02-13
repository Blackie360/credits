import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { getAdminCookieName, verifyAdminToken } from '@/lib/admin'
import { adminLogin, adminLogout, uploadEmailsCsv, uploadCodesCsv } from './actions'
import { AdminAnalytics } from './admin-analytics'
import { AdminLoginForm } from './admin-login-form'
import { AdminQueryProvider } from './query-provider'
import { CsvUpload } from './csv-upload'

export default async function AdminPage () {
  const cookieStore = await cookies()
  const token = cookieStore.get(getAdminCookieName())?.value
  const isAdmin = verifyAdminToken(token)

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
              Back to redeem
            </Link>
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] px-4 py-12 font-sans text-white">
      <div className="mx-auto max-w-5xl">
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
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Manage codes, emails, and CSV uploads
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

        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <CsvUpload
              action={uploadEmailsCsv}
              label="Upload Emails CSV"
              hint="Uses only &quot;email&quot; and &quot;name&quot; columns (case-insensitive). Other columns ignored."
            />
            <CsvUpload
              action={uploadCodesCsv}
              label="Upload Codes CSV"
              hint="Uses &quot;code&quot; or &quot;url&quot; column (e.g. https://cursor.com/referral?code=XXX). Other columns ignored."
            />
          </div>

          <AdminQueryProvider>
            <AdminAnalytics />
          </AdminQueryProvider>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-500">
          <Link href="/" className="underline hover:text-zinc-400">
            Back to redeem
          </Link>
        </p>
      </div>
    </div>
  )
}
