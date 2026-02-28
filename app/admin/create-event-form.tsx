'use client'

import { useActionState } from 'react'

type CreateEventAction = (formData: FormData) => Promise<{ error?: string } | void>

export function CreateEventForm ({ action }: { action: CreateEventAction }) {
  const [state, formAction, isPending] = useActionState(
    async (_: void | { error?: string } | null, formData: FormData) => {
      return action(formData)
    },
    null as { error?: string } | null
  )

  return (
    <form action={formAction} className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-4">
      <p className="mb-3 text-sm font-semibold text-zinc-200">Create New Event</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-zinc-400">Event name</span>
          <input
            type="text"
            name="name"
            placeholder="e.g. Cafe Cursor Nairobi"
            required
            disabled={isPending}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {isPending ? 'Creating...' : 'Create Event'}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Slug is auto-generated from the name (e.g. &quot;Cafe Cursor Nairobi&quot; &rarr; /cafe-cursor-nairobi)
      </p>
      {state?.error && (
        <p className="mt-3 text-sm text-red-400" role="alert">{state.error}</p>
      )}
    </form>
  )
}
