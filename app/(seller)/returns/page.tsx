'use client'
import { useEffect, useState, useCallback } from 'react'

interface ReturnRequest {
  id: string
  order_id: string
  reason: string
  description?: string | null
  status: string
  evidence_images?: string[]
  seller_note?: string | null
  resolution_note?: string | null
  resolved_at?: string | null
  created_at: string
  marketplace_orders?: { total_amount: number; currency: string } | null
  buyer?: { full_name?: string; phone?: string } | null
}

const REASON_LABELS: Record<string, string> = {
  item_not_received:     'Item not received',
  item_not_as_described: 'Item not as described',
  damaged:               'Item arrived damaged',
  wrong_item:            'Wrong item sent',
  changed_mind:          'Changed mind',
  other:                 'Other',
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:      { label: 'Pending',      className: 'text-amber-700 bg-amber-100' },
  under_review: { label: 'Under Review', className: 'text-blue-700 bg-blue-100' },
  approved:     { label: 'Approved',     className: 'text-green-700 bg-green-100' },
  refunded:     { label: 'Refunded',     className: 'text-green-700 bg-green-100' },
  rejected:     { label: 'Rejected',     className: 'text-red-700 bg-red-100' },
  closed:       { label: 'Closed',       className: 'text-gray-600 bg-gray-100' },
}

type ReturnsTab = 'pending' | 'resolved' | 'all'

const TABS: { key: ReturnsTab; label: string }[] = [
  { key: 'pending',  label: 'Needs Action' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all',      label: 'All Returns' },
]

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState<ReturnsTab>('pending')
  const [acting, setActing]   = useState<Record<string, boolean>>({})
  const [notes, setNotes]     = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let items: ReturnRequest[] = []
      let tot = 0
      if (tab === 'pending') {
        const [r1, r2] = await Promise.all([
          fetch('/api/proxy/shop/seller/returns?status=pending&limit=50').then(r => r.json()),
          fetch('/api/proxy/shop/seller/returns?status=under_review&limit=50').then(r => r.json()),
        ])
        items = [...(r1.returns ?? []), ...(r2.returns ?? [])]
        tot   = (r1.total ?? 0) + (r2.total ?? 0)
      } else if (tab === 'resolved') {
        const [r1, r2] = await Promise.all([
          fetch('/api/proxy/shop/seller/returns?status=refunded&limit=50').then(r => r.json()),
          fetch('/api/proxy/shop/seller/returns?status=rejected&limit=50').then(r => r.json()),
        ])
        items = [...(r1.returns ?? []), ...(r2.returns ?? [])]
        tot   = (r1.total ?? 0) + (r2.total ?? 0)
      } else {
        const r = await fetch('/api/proxy/shop/seller/returns?limit=50').then(r => r.json())
        items = r.returns ?? []
        tot   = r.total ?? 0
      }
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setReturns(items)
      setTotal(tot)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load returns')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchReturns() }, [fetchReturns])

  const handleAction = async (returnId: string, action: 'approve' | 'reject') => {
    setActing(prev => ({ ...prev, [returnId]: true }))
    setFeedback(prev => ({ ...prev, [returnId]: '' }))
    try {
      const res  = await fetch(`/api/proxy/shop/returns/${returnId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, seller_note: notes[returnId]?.trim() || undefined }),
      })
      const json = await res.json()
      if (json.success) {
        setFeedback(prev => ({ ...prev, [returnId]: action === 'approve' ? '✅ Refund issued' : '❌ Return rejected' }))
        setTimeout(() => fetchReturns(), 1200)
      } else {
        setFeedback(prev => ({ ...prev, [returnId]: json.error ?? 'Action failed' }))
      }
    } catch {
      setFeedback(prev => ({ ...prev, [returnId]: 'Something went wrong' }))
    }
    setActing(prev => ({ ...prev, [returnId]: false }))
  }

  const fmt = (n: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('en-LR').format(Math.round(n))}`

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Return Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Review and respond to buyer return requests</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="text-red-600 py-4 text-sm">{error}</div>}
      {loading && <div className="text-gray-400 py-12 text-center">Loading…</div>}

      {!loading && returns.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 font-medium">No return requests</p>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'pending' ? "No pending returns — you're all caught up." : 'No returns in this category.'}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {returns.map(r => {
          const cfg       = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending
          const isPending = ['pending', 'under_review'].includes(r.status)
          const order     = r.marketplace_orders
          return (
            <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">Return #{r.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Order #{r.order_id.slice(0, 8).toUpperCase()} &middot; {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.className}`}>
                  {cfg.label}
                </span>
              </div>

              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Buyer:</span> {r.buyer?.full_name ?? '—'} {r.buyer?.phone ? `· ${r.buyer.phone}` : ''}</p>
                <p><span className="font-medium">Reason:</span> {REASON_LABELS[r.reason] ?? r.reason}</p>
                {r.description && <p className="text-gray-500 italic">&ldquo;{r.description}&rdquo;</p>}
                {order && (
                  <p><span className="font-medium">Order value:</span> {fmt(order.total_amount, order.currency)}</p>
                )}
              </div>

              {r.resolution_note && !isPending && (
                <p className="text-xs text-gray-400 bg-gray-50 rounded p-2">{r.resolution_note}</p>
              )}

              {feedback[r.id] && (
                <p className={`text-sm font-medium ${feedback[r.id].startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>
                  {feedback[r.id]}
                </p>
              )}

              {isPending && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                    rows={2}
                    placeholder="Optional note to buyer…"
                    value={notes[r.id] ?? ''}
                    onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                    maxLength={1000}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(r.id, 'approve')}
                      disabled={acting[r.id]}
                      className="flex-1 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {acting[r.id] ? 'Processing…' : 'Approve & Refund'}
                    </button>
                    <button
                      onClick={() => handleAction(r.id, 'reject')}
                      disabled={acting[r.id]}
                      className="flex-1 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {acting[r.id] ? 'Processing…' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {total > 0 && (
        <p className="text-xs text-gray-400 text-center mt-6">{total} total return{total !== 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
