'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useActionState, useEffect, useRef } from 'react'

type EmailActionResult = { error?: string; success?: string } | void
type EmailAction = (formData: FormData) => Promise<EmailActionResult>

export function EmailManager ({
  upsertAction,
  deleteAction
}: {
  upsertAction: EmailAction
  deleteAction: EmailAction
}) {
  const queryClient = useQueryClient()
  const upsertFormRef = useRef<HTMLFormElement>(null)
  const deleteFormRef = useRef<HTMLFormElement>(null)

  const [upsertState, upsertFormAction, isUpserting] = useActionState(
    async (_: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await upsertAction(formData)
      return result ?? {}
    },
    null as { error?: string; success?: string } | null
  )

  const [deleteState, deleteFormAction, isDeleting] = useActionState(
    async (_: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await deleteAction(formData)
      return result ?? {}
    },
    null as { error?: string; success?: string } | null
  )

  useEffect(() => {
    if (!upsertState || !('success' in upsertState) || !upsertState.success) return
    upsertFormRef.current?.reset()
    queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] })
  }, [upsertState, queryClient])

  useEffect(() => {
    if (!deleteState || !('success' in deleteState) || !deleteState.success) return
    deleteFormRef.current?.reset()
    queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] })
  }, [deleteState, queryClient])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form
        ref={upsertFormRef}
        action={upsertFormAction}
        className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-4"
      >
        <p className="mb-1 text-sm font-semibold text-zinc-200">Add / Update Email</p>
        <p className="mb-3 text-xs text-zinc-500">
          Add new eligible users or replace the name for an existing email.
        </p>
        <div className="space-y-3">
          <input
            type="email"
            name="email"
            placeholder="user@example.com"
            required
            disabled={isUpserting}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <input
            type="text"
            name="name"
            placeholder="Name (optional)"
            disabled={isUpserting}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <button
            type="submit"
            disabled={isUpserting}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
          >
            {isUpserting ? 'Saving...' : 'Save email'}
          </button>
        </div>
        {upsertState && 'error' in upsertState && upsertState.error && (
          <p className="mt-3 text-sm text-red-400" role="alert">{upsertState.error}</p>
        )}
        {upsertState && 'success' in upsertState && upsertState.success && (
          <p className="mt-3 text-sm text-emerald-400">{upsertState.success}</p>
        )}
      </form>

      <form
        ref={deleteFormRef}
        action={deleteFormAction}
        className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-4"
      >
        <p className="mb-1 text-sm font-semibold text-zinc-200">Remove Email</p>
        <p className="mb-3 text-xs text-zinc-500">
          Remove an email from the allowed list immediately.
        </p>
        <div className="space-y-3">
          <input
            type="email"
            name="email"
            placeholder="user@example.com"
            required
            disabled={isDeleting}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <button
            type="submit"
            disabled={isDeleting}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
          >
            {isDeleting ? 'Removing...' : 'Remove email'}
          </button>
        </div>
        {deleteState && 'error' in deleteState && deleteState.error && (
          <p className="mt-3 text-sm text-red-400" role="alert">{deleteState.error}</p>
        )}
        {deleteState && 'success' in deleteState && deleteState.success && (
          <p className="mt-3 text-sm text-emerald-400">{deleteState.success}</p>
        )}
      </form>
    </div>
  )
}
