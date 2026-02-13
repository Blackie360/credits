'use client'

import { useActionState, useRef } from 'react'

type UploadAction = (formData: FormData) => Promise<{ error?: string } | void>

export function CsvUpload ({
  action,
  label,
  hint,
  allowReplace = true
}: {
  action: UploadAction
  label: string
  hint: string
  allowReplace?: boolean
}) {
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState(
    async (_: void | { error?: string } | null, formData: FormData) => {
      return action(formData)
    },
    null as { error?: string } | null
  )

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-4"
    >
      <p className="mb-1 text-sm font-semibold text-zinc-200">{label}</p>
      <p className="mb-3 text-xs text-zinc-500">{hint}</p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="sr-only">Choose CSV file</span>
          <input
            type="file"
            name="file"
            accept=".csv"
            required
            disabled={isPending}
            className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border file:border-zinc-600 file:bg-zinc-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-200 file:transition-colors hover:file:bg-zinc-600 disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
        >
          {isPending ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {allowReplace && (
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            name="replace"
            value="on"
            disabled={isPending}
            className="rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm text-zinc-400">
            Replace existing data (delete all, then insert from CSV)
          </span>
        </label>
      )}

      {state?.error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}
