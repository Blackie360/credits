'use client'

import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'

type AnalyticsResponse = {
  summary: {
    total: number
    redeemed: number
    available: number
    allowedEmails: number
  }
  codes: Array<{
    id: number
    code: string
    status: 'redeemed' | 'available'
    claimedByEmail: string | null
  }>
  emails: Array<{ email: string; name: string | null }>
}

async function fetchAnalytics (): Promise<AnalyticsResponse> {
  const res = await fetch('/api/admin/analytics')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

function SummaryCards ({ data }: { data: AnalyticsResponse['summary'] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <div className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total codes</p>
        <p className="mt-1 text-2xl font-bold text-white">{data.total}</p>
      </div>
      <div className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Redeemed</p>
        <p className="mt-1 text-2xl font-bold text-orange-500">{data.redeemed}</p>
      </div>
      <div className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Available</p>
        <p className="mt-1 text-2xl font-bold text-emerald-500">{data.available}</p>
      </div>
      <div className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Allowed emails</p>
        <p className="mt-1 text-2xl font-bold text-blue-400">{data.allowedEmails}</p>
      </div>
    </div>
  )
}

function CodesDataTable ({ data }: { data: AnalyticsResponse['codes'] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'code', desc: false }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const columnHelper = createColumnHelper<AnalyticsResponse['codes'][0]>()
  const columns = useMemo(
    () => [
      columnHelper.accessor('code', {
        header: 'Code',
        cell: (info) => (
          <span className="font-mono text-zinc-200">{info.getValue()}</span>
        )
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true
          return row.getValue('status') === filterValue
        },
        cell: (info) => {
          const status = info.getValue()
          return status === 'redeemed'
            ? (
              <span className="rounded bg-orange-500/20 px-2 py-0.5 text-orange-400">
                Redeemed
              </span>
              )
            : (
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-400">
                Available
              </span>
              )
        }
      }),
      columnHelper.accessor('claimedByEmail', {
        header: 'Redeemed by',
        cell: (info) => (
          <span className="text-zinc-400">{info.getValue() ?? '—'}</span>
        )
      })
    ],
    [columnHelper]
  ) as ColumnDef<AnalyticsResponse['codes'][0], string | null>[]

  /* eslint-disable react-hooks/incompatible-library -- TanStack Table returns functions not suitable for React Compiler memoization */
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: (updater) => setSorting((prev) => (typeof updater === 'function' ? updater(prev) : prev)),
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  })
  /* eslint-enable react-hooks/incompatible-library */

  const statusFilter = columnFilters.find((f) => f.id === 'status')?.value as string | undefined

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-600/60 bg-zinc-800/50">
      <div className="flex flex-col gap-3 border-b border-zinc-600/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">Referral Codes</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search codes or emails..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:min-w-[200px]"
          />
          <select
            value={statusFilter ?? ''}
            onChange={(e) => {
              const v = e.target.value
              table.getColumn('status')?.setFilterValue(v || undefined)
            }}
            className="rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="redeemed">Redeemed</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-600/60">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-4 py-3 font-semibold text-zinc-300"
                  >
                    {h.column.getCanSort()
                      ? (
                        <button
                          type="button"
                          onClick={() => h.column.toggleSorting()}
                          className="flex items-center gap-1 hover:text-white"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <span className="text-zinc-500">
                            {{
                              asc: ' ↑',
                              desc: ' ↓'
                            }[h.column.getIsSorted() as string] ?? ''}
                          </span>
                        </button>
                        )
                      : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-700/50 last:border-0"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="px-4 py-6 text-center text-zinc-500">
          No codes yet. Upload a CSV to get started.
        </div>
      )}
      {data.length > 0 && table.getRowModel().rows.length === 0 && (
        <div className="px-4 py-6 text-center text-zinc-500">
          No codes match your filters. Try adjusting search or status.
        </div>
      )}
      {data.length > 0 && table.getRowModel().rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-600/60 px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 disabled:opacity-50 hover:bg-zinc-700"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 disabled:opacity-50 hover:bg-zinc-700"
            >
              Next
            </button>
          </div>
          <span className="text-xs text-zinc-500">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()} ({table.getFilteredRowModel().rows.length} rows)
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

function EmailsDataTable ({ data }: { data: AnalyticsResponse['emails'] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'email', desc: false }])
  const [globalFilter, setGlobalFilter] = useState('')

  const columnHelper = createColumnHelper<AnalyticsResponse['emails'][0]>()
  const columns = useMemo(
    () => [
      columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => <span className="text-zinc-200">{info.getValue()}</span>
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <span className="text-zinc-400">{info.getValue() ?? '—'}</span>
        )
      })
    ],
    [columnHelper]
  ) as ColumnDef<AnalyticsResponse['emails'][0], string | null>[]

  /* eslint-disable react-hooks/incompatible-library -- TanStack Table returns functions not suitable for React Compiler memoization */
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: (updater) => setSorting((prev) => (typeof updater === 'function' ? updater(prev) : prev)),
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  })
  /* eslint-enable react-hooks/incompatible-library */

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-600/60 bg-zinc-800/50">
      <div className="flex flex-col gap-3 border-b border-zinc-600/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">
          Allowed Emails ({data.length})
        </h2>
        <input
          type="text"
          placeholder="Search emails..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-600/60">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-4 py-3 font-semibold text-zinc-300"
                  >
                    {h.column.getCanSort()
                      ? (
                        <button
                          type="button"
                          onClick={() => h.column.toggleSorting()}
                          className="flex items-center gap-1 hover:text-white"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <span className="text-zinc-500">
                            {{
                              asc: ' ↑',
                              desc: ' ↓'
                            }[h.column.getIsSorted() as string] ?? ''}
                          </span>
                        </button>
                        )
                      : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-700/50 last:border-0"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="px-4 py-6 text-center text-zinc-500">
          No allowed emails yet. Upload a CSV to get started.
        </div>
      )}
      {data.length > 0 && table.getRowModel().rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-600/60 px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 disabled:opacity-50 hover:bg-zinc-700"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 disabled:opacity-50 hover:bg-zinc-700"
            >
              Next
            </button>
          </div>
          <span className="text-xs text-zinc-500">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()} ({table.getFilteredRowModel().rows.length} rows)
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>
      )}
      {data.length > 0 && table.getRowModel().rows.length === 0 && (
        <div className="px-4 py-6 text-center text-zinc-500">
          No emails match your search.
        </div>
      )}
    </div>
  )
}

export function AdminAnalytics () {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: fetchAnalytics
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-4"
            >
              <div className="h-3 w-20 rounded bg-zinc-600" />
              <div className="mt-2 h-8 w-16 rounded bg-zinc-600" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-zinc-600/60 bg-zinc-800/50 p-8 text-center text-zinc-500">
          Loading analytics…
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">
          {error instanceof Error ? error.message : 'Failed to load analytics'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      <SummaryCards data={data.summary} />
      <CodesDataTable data={data.codes} />
      <EmailsDataTable data={data.emails} />
    </div>
  )
}
