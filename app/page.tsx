'use client'

import Image from 'next/image'
import { useActionState, useEffect, useState } from 'react'
import { redeemCode, getCodeCounts, type RedeemResult } from './actions/redeem'

export default function Home () {
  const [result, formAction, isPending] = useActionState(redeemCode, null as RedeemResult | null)
  const [counts, setCounts] = useState<{ available: number; total: number } | null>(null)

  const refreshCounts = () => {
    getCodeCounts().then(setCounts)
  }

  useEffect(() => {
    refreshCounts()
  }, [])

  useEffect(() => {
    if (result?.success) {
      refreshCounts()
    }
  }, [result?.success])

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
            Cursor Pro Redeem Codes
          </h1>
          <p className="text-center text-sm font-normal text-zinc-400">
            Redeem your Cursor Pro access code
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-6">
          <div className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 px-4 py-2">
            <span className="text-sm text-zinc-300">Available: </span>
            <span className="text-sm font-medium text-orange-500">
              {counts ? `${counts.available}/${counts.total}` : '–/–'}
            </span>
          </div>

          {result?.success && (
            <div className="w-full rounded-lg border border-green-600/60 bg-green-900/20 px-4 py-3 text-sm text-green-300">
              <p className="font-medium">Code redeemed successfully.</p>
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
              {result.error}
            </div>
          )}

          <form
            action={formAction}
            className="flex w-full flex-col gap-4"
          >
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

        <p className="text-center text-xs text-zinc-500">
          cursor pro codes by cursor kenya community
        </p>
      </main>
    </div>
  )
}
