'use client'

import { useActionState } from 'react'

type DeleteEventAction = (formData: FormData) => Promise<{ error?: string } | void>

export function DeleteEventButton ({
  slug,
  name,
  action
}: {
  slug: string
  name: string
  action: DeleteEventAction
}) {
  const [state, formAction, isPending] = useActionState(
    async (_: void | { error?: string } | null, formData: FormData) => {
      return action(formData)
    },
    null as { error?: string } | null
  )

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-red-600/60 bg-red-900/20 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/40 hover:text-red-300 disabled:opacity-50"
        onClick={(e) => {
          if (!confirm(`Delete "${name}" and all its codes/emails?`)) {
            e.preventDefault()
          }
        }}
      >
        {isPending ? 'Deleting...' : 'Delete'}
      </button>
      {state?.error && (
        <p className="mt-1 text-xs text-red-400">{state.error}</p>
      )}
    </form>
  )
}
