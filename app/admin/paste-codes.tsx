'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useActionState, useCallback, useEffect, useRef, useState } from 'react'

type PasteAction = (formData: FormData) => Promise<{ error?: string; success?: string } | void>

export function PasteCodes ({
  action,
  eventSlug
}: {
  action: PasteAction
  eventSlug: string
}) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [state, formAction, isPending] = useActionState(
    async (_: void | { error?: string; success?: string } | null, formData: FormData) => {
      const result = await action(formData)
      if (result && 'success' in result) {
        formRef.current?.reset()
        queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] })
        setIsOpen(false)
      }
      return result ?? {}
    },
    null as { error?: string; success?: string } | null
  )

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => setIsOpen(false)
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
      >
        Paste Codes
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-lg rounded-xl border border-zinc-600/60 bg-[#1a1a1a] p-0 text-white shadow-2xl backdrop:bg-black/60"
      >
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">Paste Codes</h2>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          <p className="mb-4 text-sm text-zinc-400">
            Paste codes or referral URLs, one per line.
          </p>

          <form ref={formRef} action={formAction}>
            <input type="hidden" name="eventSlug" value={eventSlug} />

            <textarea
              name="codes"
              rows={8}
              required
              disabled={isPending}
              autoFocus
              placeholder={'https://cursor.com/referral?code=abc123\nhttps://cursor.com/referral?code=def456\nor just raw codes:\nabc123\ndef456'}
              className="mb-4 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="replace"
                  value="on"
                  disabled={isPending}
                  className="rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-zinc-400">Replace existing codes</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={isPending}
                  className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
                >
                  {isPending ? 'Adding...' : 'Add Codes'}
                </button>
              </div>
            </div>

            {state?.error && (
              <p className="mt-3 text-sm text-red-400" role="alert">{state.error}</p>
            )}
            {state?.success && (
              <p className="mt-3 text-sm text-emerald-400">{state.success}</p>
            )}
          </form>
        </div>
      </dialog>
    </>
  )
}
