'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { POOL_SLUG } from '@/lib/pool'
import {
  pasteCodesToPool,
  uploadCodesToPool,
  assignBatchToEvent,
  syncUnclaimedToPool
} from './actions'

type PoolCode = {
  id: number
  code: string
  url: string
}

type EventOption = {
  slug: string
  name: string
}

type PoolSectionProps = {
  poolCodes: PoolCode[]
  events: EventOption[]
}

function CopyButton ({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white"
      title="Copy URL"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export function PoolSection ({ poolCodes, events }: PoolSectionProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'paste' | 'csv'>('paste')
  const addDialogRef = useRef<HTMLDialogElement>(null)
  const pasteFormRef = useRef<HTMLFormElement>(null)
  const csvFormRef = useRef<HTMLFormElement>(null)

  const realEvents = events.filter((e) => e.slug !== POOL_SLUG)

  const onPasteSuccess = useCallback(() => {
    pasteFormRef.current?.reset()
    setAddDialogOpen(false)
    router.refresh()
  }, [router])

  const onCsvSuccess = useCallback(() => {
    csvFormRef.current?.reset()
    setAddDialogOpen(false)
    router.refresh()
  }, [router])

  const onAssignSuccess = useCallback(() => {
    setSelectedIds(new Set())
    router.refresh()
  }, [router])

  const onReclaimSuccess = useCallback(() => {
    router.refresh()
  }, [router])

  const [reclaimState, reclaimAction, isReclaimPending] = useActionState(
    async (_: unknown) => {
      const result = await syncUnclaimedToPool()
      if (result && 'synced' in result) {
        onReclaimSuccess()
        return { success: `Reclaimed ${result.synced} unclaimed code${result.synced === 1 ? '' : 's'} to pool.` }
      }
      return result ?? {}
    },
    null as { error?: string; success?: string } | null
  )

  const [pasteState, pasteAction, isPastePending] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await pasteCodesToPool(formData)
      if (result && 'success' in result) {
        onPasteSuccess()
      }
      return result ?? {}
    },
    null as { error?: string; success?: string } | null
  )

  const [csvState, csvAction, isCsvPending] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await uploadCodesToPool(formData)
      if (result && 'success' in result) {
        onCsvSuccess()
      }
      return result ?? {}
    },
    null as { error?: string; success?: string } | null
  )

  const [assignState, assignAction, isAssignPending] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await assignBatchToEvent(formData)
      if (result && 'success' in result) {
        onAssignSuccess()
      }
      return result ?? {}
    },
    null as { error?: string; success?: string } | null
  )

  useEffect(() => {
    if (addDialogOpen) {
      addDialogRef.current?.showModal()
    } else {
      addDialogRef.current?.close()
    }
  }, [addDialogOpen])

  useEffect(() => {
    const dialog = addDialogRef.current
    if (!dialog) return
    const handleClose = () => setAddDialogOpen(false)
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 50) {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectFirstN = useCallback((n: number) => {
    const ids = poolCodes.slice(0, n).map((c) => c.id)
    setSelectedIds(new Set(ids))
  }, [poolCodes])

  const selectAll = useCallback(() => {
    const max = Math.min(50, poolCodes.length)
    selectFirstN(max)
  }, [poolCodes.length, selectFirstN])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedCount = selectedIds.size
  const canAssign = selectedCount >= 5 && selectedCount <= 50 && realEvents.length > 0

  return (
    <div className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-zinc-200">
          Unclaimed Credits (Pool)
        </h2>
        <div className="flex flex-wrap gap-2">
          <form action={reclaimAction}>
            <button
              type="submit"
              disabled={isReclaimPending}
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
            >
              {isReclaimPending ? 'Reclaiming...' : 'Reclaim unclaimed to pool'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setAddDialogOpen(true)}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
          >
            Add to Pool
          </button>
        </div>
      </div>
      {(reclaimState?.success ?? reclaimState?.error) && (
        <p className={`mb-4 text-sm ${reclaimState?.error ? 'text-red-400' : 'text-emerald-400'}`} role="alert">
          {reclaimState.success ?? reclaimState.error}
        </p>
      )}

      <dialog
        ref={addDialogRef}
        className="w-full max-w-lg rounded-xl border border-zinc-600/60 bg-[#1a1a1a] p-0 text-white shadow-2xl backdrop:bg-black/60"
      >
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-100">Add to Pool</h3>
            <button
              type="button"
              onClick={() => setAddDialogOpen(false)}
              className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          <div className="mb-4 flex gap-2 border-b border-zinc-600/60">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-2 text-sm font-medium ${activeTab === 'paste' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Paste
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('csv')}
              className={`px-3 py-2 text-sm font-medium ${activeTab === 'csv' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Upload CSV
            </button>
          </div>

          {activeTab === 'paste' && (
            <form ref={pasteFormRef} action={pasteAction}>
              <p className="mb-3 text-sm text-zinc-400">
                Paste codes or referral URLs, one per line.
              </p>
              <textarea
                name="codes"
                rows={8}
                required
                disabled={isPastePending}
                autoFocus
                placeholder="https://cursor.com/referral?code=abc123&#10;abc123"
                className="mb-4 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddDialogOpen(false)}
                  disabled={isPastePending}
                  className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPastePending}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
                >
                  {isPastePending ? 'Adding...' : 'Add to Pool'}
                </button>
              </div>
              {pasteState?.error && (
                <p className="mt-3 text-sm text-red-400" role="alert">{pasteState.error}</p>
              )}
              {pasteState?.success && (
                <p className="mt-3 text-sm text-emerald-400">{pasteState.success}</p>
              )}
            </form>
          )}

          {activeTab === 'csv' && (
            <form ref={csvFormRef} action={csvAction}>
              <p className="mb-3 text-sm text-zinc-400">
                Upload a CSV with codes, URLs, or one code per line.
              </p>
              <input
                type="file"
                name="file"
                accept=".csv"
                required
                disabled={isCsvPending}
                className="mb-4 block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border file:border-zinc-600 file:bg-zinc-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-200"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddDialogOpen(false)}
                  disabled={isCsvPending}
                  className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCsvPending}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
                >
                  {isCsvPending ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              {csvState?.error && (
                <p className="mt-3 text-sm text-red-400" role="alert">{csvState.error}</p>
              )}
              {csvState?.success && (
                <p className="mt-3 text-sm text-emerald-400">{csvState.success}</p>
              )}
            </form>
          )}
        </div>
      </dialog>

      {poolCodes.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          No unclaimed credits in the pool. Add codes via paste or CSV upload above.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-400">
              {poolCodes.length} code{poolCodes.length === 1 ? '' : 's'} in pool
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Select first:</span>
              <select
                onChange={(e) => {
                  const v = e.target.value
                  if (v) selectFirstN(Number(v))
                }}
                className="rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-200"
              >
                <option value="">—</option>
                {Array.from(
                  { length: Math.max(0, Math.min(50, poolCodes.length) - 5 + 1) },
                  (_, i) => i + 5
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={selectAll}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Select up to 50
              </button>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="sticky top-0 bg-zinc-800/95">
                <tr className="border-b border-zinc-600/60">
                  <th className="w-10 px-3 py-2">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-3 py-2 font-semibold text-zinc-300">Code / URL</th>
                  <th className="w-14 px-3 py-2">
                    <span className="sr-only">Copy</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {poolCodes.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-700/50 last:border-0"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        disabled={!selectedIds.has(row.id) && selectedIds.size >= 50}
                        className="rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-zinc-200 underline hover:text-white"
                      >
                        {row.url}
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      <CopyButton text={row.url} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {poolCodes.length >= 5 && realEvents.length > 0 && (
            <form action={assignAction} className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-600/60 pt-4">
              {Array.from(selectedIds).map((id) => (
                <input key={id} type="hidden" name="ids" value={id} />
              ))}
              <div>
                <label htmlFor="assign-event" className="mb-1 block text-xs text-zinc-500">
                  Assign to event
                </label>
                <select
                  id="assign-event"
                  name="targetEventSlug"
                  required
                  disabled={isAssignPending}
                  className="rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  <option value="">Select event…</option>
                  {realEvents.map((ev) => (
                    <option key={ev.slug} value={ev.slug}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={!canAssign || isAssignPending}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
              >
                {isAssignPending ? 'Assigning...' : `Assign batch (${selectedCount})`}
              </button>
              {selectedCount > 0 && selectedCount < 5 && (
                <span className="text-xs text-amber-400">
                  Select 5–50 codes to assign
                </span>
              )}
              {selectedCount > 50 && (
                <span className="text-xs text-amber-400">
                  Maximum 50 codes per batch
                </span>
              )}
              {assignState?.error && (
                <p className="w-full text-sm text-red-400" role="alert">{assignState.error}</p>
              )}
              {assignState?.success && (
                <p className="w-full text-sm text-emerald-400">{assignState.success}</p>
              )}
            </form>
          )}
        </>
      )}
    </div>
  )
}
