'use client'

import { useActionState, useEffect, useState } from 'react'
import { redeemCode, getCodeCounts, type RedeemResult } from './actions/redeem'

function Logo () {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto text-white"
      aria-hidden
    >
      <rect
        x="4"
        y="4"
        width="48"
        height="48"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M28 20L18 36h20L28 20z"
        fill="currentColor"
      />
    </svg>
  )
}

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
          <Logo />
          <h1 className="text-center text-2xl font-bold tracking-tight">
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
          Cursor Pro Redeem Codes pwani
        </p>
      </main>
    </div>
  )
}
