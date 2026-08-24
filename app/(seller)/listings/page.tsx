'use client'
import { useEffect, useState, useCallback } from 'react'

interface SellerAccounts {
  plan_type: string
  seller_tier: string
  merchants?: {
    business_name: string
    merchant_code: string
  } | null
}

// Listing status for this seller's own products.
//
// This page used to call admin/marketplace/products and offer Approve and
// Reject buttons — a platform moderation console sitting in the seller portal.
// It could never have worked: that route is gated by requireAdminCS, so every
// seller was refused. Approval is Blue Boney's decision and a seller must not
// review their own listing, so the actions are gone and this reads the seller's
// own products instead.
//
// The backend already refused self-approval independently, which is the part
// that matters and was verified rather than assumed: creating a product with
// status "approved" is stored as pending, and patching status to "approved" is
// accepted and ignored. This page no longer asks for something it cannot have.
interface Product {
  id: string
  title: string
  brand?: string | null
  category: string
  subcategory?: string | null
  price: string
  currency: string
  images?: string[]
  stock_qty: number
  status: string
  approval_note?: string | null
  risk_score?: number | null
  risk_tier?: string | null
  auto_approved?: boolean
  fulfillment_type?: string | null
  created_at: string
  seller_accounts?: SellerAccounts | null
}

const RISK_BADGE: Record<string, string> = {
  low:    'text-green-700 bg-green-100',
  medium: 'text-amber-700 bg-amber-100',
  high:   'text-red-700 bg-red-100',
}

const PLAN_BADGE: Record<string, string> = {
  free:         'text-gray-600 bg-gray-100',
  basic:        'text-blue-700 bg-blue-100',
  professional: 'text-purple-700 bg-purple-100',
  enterprise:   'text-indigo-700 bg-indigo-100',
}

type Tab = 'pending' | 'approved' | 'rejected'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const LIMIT = 50

export default function ListingStatusPage() {
  const [products, setProducts]     = useState<Product[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [tab, setTab]               = useState<Tab>('pending')
  const [pendingCount, setPending]  = useState(0)
  const [offset, setOffset]         = useState(0)

  const fetchProducts = useCallback(async (currentTab: Tab, off: number, append: boolean) => {
    if (!append) setLoading(true)
    setError('')
    try {
      const res  = await fetch(
        `/api/proxy/shop/seller/products?status=${currentTab}&limit=${LIMIT}&offset=${off}`,
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load products')
      const incoming: Product[] = json.products ?? []
      setProducts(prev => append ? [...prev, ...incoming] : incoming)
      setTotal(json.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPendingCount = useCallback(async () => {
    try {
      const res  = await fetch('/api/proxy/shop/seller/products?status=pending&limit=1&offset=0')
      const json = await res.json()
      setPending(json.total ?? 0)
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    setOffset(0)
    setProducts([])
    fetchProducts(tab, 0, false)
    fetchPendingCount()
  }, [tab, fetchProducts, fetchPendingCount])


  const loadMore = () => {
    const next = offset + LIMIT
    setOffset(next)
    fetchProducts(tab, next, true)
  }

  const tabLabel = (t: Tab) => {
    const base = TABS.find(x => x.key === t)?.label ?? t
    if (t === 'pending' && pendingCount > 0) return `${base} (${pendingCount})`
    return base
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Listing Status</h1>
        <p className="text-sm text-gray-500 mt-1">Where your listings are in Blue Boney&rsquo;s review</p>
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
            {tabLabel(t.key)}
          </button>
        ))}
      </div>

      {error && <div className="text-red-600 py-4 text-sm">{error}</div>}
      {loading && <div className="text-gray-400 py-12 text-center">Loading…</div>}

      {!loading && products.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 font-medium">No products</p>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'pending'
              ? 'No products awaiting approval.'
              : tab === 'approved'
              ? 'No approved products yet.'
              : 'No rejected products.'}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {products.map(p => {
          const seller     = p.seller_accounts
          const merchant   = seller?.merchants
          const riskClass  = RISK_BADGE[p.risk_tier ?? 'low'] ?? RISK_BADGE.low
          const planClass  = PLAN_BADGE[seller?.plan_type ?? 'free'] ?? PLAN_BADGE.free
          const isPending  = p.status === 'pending'
          const thumb      = p.images?.[0]

          return (
            <div key={p.id} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400">No image</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 leading-snug">{p.title}</p>
                      {p.brand && <p className="text-xs text-gray-500 mt-0.5">{p.brand}</p>}
                    </div>
                    {p.risk_tier && (
                      <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${riskClass}`}>
                        {p.risk_tier.charAt(0).toUpperCase() + p.risk_tier.slice(1)} risk
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 text-sm text-gray-700 space-y-0.5">
                    <p>
                      <span className="font-medium">Category:</span>{' '}
                      {p.category}{p.subcategory ? ` › ${p.subcategory}` : ''}
                    </p>
                    <p>
                      <span className="font-medium">Price:</span>{' '}
                      {p.currency} {new Intl.NumberFormat('en-LR').format(parseFloat(p.price))}
                      {' '}·{' '}
                      <span className="text-gray-500">{p.stock_qty} in stock</span>
                    </p>
                    {p.fulfillment_type && (
                      <p>
                        <span className="font-medium">Fulfillment:</span>{' '}
                        <span className="capitalize">{p.fulfillment_type}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <p className="text-gray-700">
                  <span className="font-medium">Seller:</span>{' '}
                  {merchant?.business_name ?? '—'}
                  {merchant?.merchant_code ? (
                    <span className="text-gray-400 ml-1">({merchant.merchant_code})</span>
                  ) : null}
                </p>
                {seller?.plan_type && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${planClass}`}>
                    {seller.plan_type}
                  </span>
                )}
                {seller?.seller_tier && (
                  <span className="text-xs text-gray-500 capitalize">{seller.seller_tier} seller</span>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(p.created_at).toLocaleDateString('en-LR', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </span>
              </div>

              {!isPending && p.approval_note && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 italic">Note: {p.approval_note}</p>
              )}

            </div>
          )
        })}
      </div>

      {products.length < total && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            className="px-6 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Load more
          </button>
        </div>
      )}

      {total > 0 && !loading && (
        <p className="text-xs text-gray-400 text-center mt-4">
          Showing {products.length} of {total} product{total !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
