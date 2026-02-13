'use client'

import { useActionState } from 'react'

type LoginAction = (formData: FormData) => Promise<{ error?: string } | void>

export function AdminLoginForm ({ action }: { action: LoginAction }) {
  const [state, formAction] = useActionState(
    async (_: void | { error?: string } | null, formData: FormData) => {
      return action(formData)
    },
    null as { error?: string } | null
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="sr-only" htmlFor="admin-username">
          Username
        </label>
        <input
          id="admin-username"
          name="username"
          type="text"
          placeholder="Username"
          autoComplete="username"
          className="w-full rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          required
        />
      </div>
      <div>
        <label className="sr-only" htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          className="w-full rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          required
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
      >
        Sign in
      </button>
    </form>
  )
}
