'use client'
import { useEffect, useState } from 'react'

interface OrderItem {
  product_name_snapshot: string
  quantity: number
}

interface Order {
  id: string
  status: string
  total_amount: number
  currency: string
  created_at: string
  items: OrderItem[]
}

interface OrdersResponse {
  orders: Order[]
  total: number
}

type TabKey = 'all' | 'paid' | 'ready' | 'completed' | 'cancelled'

const TABS: { label: string; key: TabKey; statusParam?: string }[] = [
  { label: 'All',       key: 'all' },
  { label: 'Pending',   key: 'paid',      statusParam: 'paid' },
  { label: 'Ready',     key: 'ready',     statusParam: 'ready' },
  { label: 'Completed', key: 'completed', statusParam: 'completed' },
  { label: 'Cancelled', key: 'cancelled', statusParam: 'cancelled' },
]

const STATUS_PILL: Record<string, string> = {
  paid:      'bg-amber-100 text-amber-800',
  ready:     'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-LR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-LR', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pickupInputs, setPickupInputs] = useState<Record<string, string>>({})
  const [completing, setCompleting] = useState<Record<string, boolean>>({})
  const [marking, setMarking] = useState<Record<string, boolean>>({})

  const tab = TABS.find(t => t.key === activeTab)!

  useEffect(() => {
    setLoading(true)
    setError('')
    const qs = tab.statusParam ? `?status=${tab.statusParam}&limit=20` : '?limit=20'
    fetch(`/api/proxy/shop/seller/orders${qs}`)
      .then(r => r.json())
      .then((res: OrdersResponse) => setOrders(res.orders ?? []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function markReady(orderId: string) {
    setMarking(prev => ({ ...prev, [orderId]: true }))
    setError('')
    try {
      // The SELLER route. This used to PATCH /shop/orders/[id], which is the
      // buyer-facing one and exports only GET and DELETE — so every attempt
      // returned 405 while the screen cheerfully showed the order as ready.
      const res = await fetch(`/api/proxy/shop/seller/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.message ?? body?.error ?? 'Could not mark that order ready')
        return
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ready' } : o))
    } catch {
      setError('Could not reach the server')
    } finally {
      setMarking(prev => ({ ...prev, [orderId]: false }))
    }
  }

  async function completeOrder(orderId: string) {
    const code = pickupInputs[orderId] ?? ''
    setCompleting(prev => ({ ...prev, [orderId]: true }))
    setError('')
    try {
      // Wrong route AND wrong field: the server reads `handover_code`, so the
      // buyer's code was being dropped even had the path been right. Completing
      // an order releases the money held in escrow, so the server refuses it
      // without the code — and this screen was reporting success regardless,
      // which meant a seller could believe goods had been handed over and paid
      // for when neither had happened.
      const res = await fetch(`/api/proxy/shop/seller/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', handover_code: code }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.message ?? body?.error ?? 'Could not complete that order')
        return
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o))
      setPickupInputs(prev => { const n = { ...prev }; delete n[orderId]; return n })
    } catch {
      setError('Could not reach the server')
    } finally {
      setCompleting(prev => ({ ...prev, [orderId]: false }))
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your incoming and active orders</p>
      </div>

      {/* Tab row */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-400 py-12 text-center">Loading…</div>}
      {error && <div className="text-red-600 py-4">{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="text-gray-400 py-12 text-center">No orders found.</div>
      )}

      {!loading && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map(order => {
            const itemList = order.items.map(i =>
              `${i.product_name_snapshot}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`
            ).join(', ')
            const showPickupInput = order.status === 'ready' && pickupInputs[order.id] !== undefined

            return (
              <div key={order.id} className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-gray-700">#{order.id.slice(0, 8)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{itemList}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">LRD {fmt(order.total_amount)}</p>
                  </div>
                </div>

                {order.status === 'paid' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => markReady(order.id)}
                      disabled={marking[order.id]}
                      className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {marking[order.id] ? 'Updating…' : 'Mark Ready'}
                    </button>
                  </div>
                )}

                {order.status === 'ready' && (
                  <div className="mt-3 flex items-center justify-end gap-2">
                    {showPickupInput ? (
                      <>
                        <input
                          type="text"
                          placeholder="Enter pickup code"
                          value={pickupInputs[order.id] ?? ''}
                          onChange={e => setPickupInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                          className="text-sm border border-gray-300 rounded px-2 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                        <button
                          onClick={() => completeOrder(order.id)}
                          disabled={completing[order.id]}
                          className="text-sm px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {completing[order.id] ? 'Completing…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setPickupInputs(prev => { const n = { ...prev }; delete n[order.id]; return n })}
                          className="text-sm px-2 py-1.5 text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setPickupInputs(prev => ({ ...prev, [order.id]: '' }))}
                        className="text-sm px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
