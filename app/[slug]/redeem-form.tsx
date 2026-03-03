'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState } from 'react'
import { redeemCode, type RedeemResult } from '../actions/redeem'

export function RedeemForm ({ eventSlug, eventName }: { eventSlug: string; eventName: string }) {
  const [result, formAction, isPending] = useActionState(redeemCode, null as RedeemResult | null)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1a1a1a] px-4 py-16 font-sans text-white">
      <main className="flex w-full max-w-md flex-col items-center gap-8">
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
            {eventName}
          </h1>
          <p className="text-center text-sm font-normal text-zinc-400">
            Redeem your Cursor Pro access code
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-6">
          <p className="text-center text-sm text-zinc-400">
            Kindly use the same email you RSVPed with on Luma.
            <br />
            It can be a separate email from the one associated with your Cursor account.
          </p>

          {result?.success && (
            <div className="w-full rounded-lg border border-green-600/60 bg-green-900/20 px-4 py-3 text-sm text-green-300">
              <p className="font-medium">Code assigned successfully. A confirmation email was sent.</p>
              <p className="mt-1 break-all">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-green-200"
                >
                  {result.url}
                </a>
              </p>
              <p className="mt-1 text-zinc-400">Code: {result.code}</p>
            </div>
          )}

          {result && !result.success && (
            <div
              className="w-full rounded-lg border border-red-600/60 bg-red-900/20 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              <p>{result.error}</p>
              {result.url && (
                <p className="mt-1 break-all">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-red-200"
                  >
                    {result.url}
                  </a>
                </p>
              )}
            </div>
          )}

          <form
            action={formAction}
            className="flex w-full flex-col gap-4"
          >
            <input type="hidden" name="eventSlug" value={eventSlug} />
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="w-full rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              aria-label="Email"
              required
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] disabled:opacity-60"
            >
              {isPending ? 'Redeeming…' : 'Redeem Code'}
            </button>
          </form>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-xs text-zinc-500">
            cursor pro codes by cursor kenya community
          </p>
          <Link href="/" className="text-xs text-zinc-500 underline hover:text-zinc-400">
            All events
          </Link>
        </div>
      </main>
    </div>
  )
}
