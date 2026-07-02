'use client'
import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface SellerProduct {
  id: string
  title: string
  brand?: string
  category: string
  price: number
  compare_at_price?: number | null
  currency: string
  images?: string[]
  stock_qty: number
  status: string
  is_active: boolean
  view_count: number
  created_at: string
  variant_label?: string | null
  parent_product_id?: string | null
}

interface ProductsResponse {
  products: SellerProduct[]
  total: number
  limit: number
  offset: number
}

type Tab = 'all' | 'live' | 'pending' | 'inactive'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',      label: 'All Products' },
  { key: 'live',     label: 'Live' },
  { key: 'pending',  label: 'Pending Review' },
  { key: 'inactive', label: 'Inactive' },
]

const CATEGORIES = [
  'electronics', 'fashion', 'food', 'home', 'beauty', 'sports',
  'automotive', 'books', 'toys', 'health', 'agriculture', 'services', 'other',
]

const LIMIT = 20

function StatusBadge({ status, isActive }: { status: string; isActive: boolean }) {
  const isLive = isActive && (status === 'approved' || status === 'auto_approved')
  if (isLive)
    return <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Live</span>
  if (status === 'pending')
    return <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>
  if (status === 'rejected')
    return <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Rejected</span>
  return <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-LR').format(Math.round(n))
}

// ---------- Add Product Modal ----------

interface AddProductForm {
  title: string
  brand: string
  barcode: string
  description: string
  category: string
  price: string
  compare_at_price: string
  stock_qty: string
  fulfillment_type: 'pickup' | 'delivery'
}

const EMPTY_FORM: AddProductForm = {
  title: '',
  brand: '',
  barcode: '',
  description: '',
  category: '',
  price: '',
  compare_at_price: '',
  stock_qty: '0',
  fulfillment_type: 'pickup',
}

interface AddProductModalProps {
  onClose: () => void
  onCreated: () => void
}

function AddProductModal({ onClose, onCreated }: AddProductModalProps) {
  const [form, setForm] = useState<AddProductForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof AddProductForm, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)

  function set<K extends keyof AddProductForm>(key: K, value: AddProductForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof AddProductForm, string>> = {}
    if (!form.title.trim()) e.title = 'Product title is required.'
    if (!form.price.trim()) {
      e.price = 'Price is required.'
    } else if (isNaN(Number(form.price)) || Number(form.price) <= 0) {
      e.price = 'Price must be a positive number.'
    }
    if (!form.category) e.category = 'Select a category.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setApiError('')
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        category: form.category,
        price: Number(form.price),
        stock_qty: Number(form.stock_qty) || 0,
        fulfillment_type: form.fulfillment_type,
        currency: 'LRD',
      }
      if (form.brand.trim()) body.brand = form.brand.trim()
      if (form.barcode.trim()) body.barcode = form.barcode.trim()
      if (form.description.trim()) body.description = form.description.trim()
      if (form.compare_at_price.trim() && Number(form.compare_at_price) > 0) {
        body.compare_at_price = Number(form.compare_at_price)
      }

      const res = await fetch('/api/proxy/shop/seller/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setApiError(data.error ?? 'Failed to create product.')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onCreated()
        onClose()
      }, 1000)
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-medium">
              Product created! It will be reviewed within 1–2 business days.
            </div>
          )}

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Samsung Galaxy A15"
              maxLength={200}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
          </div>

          {/* Brand + Barcode (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
                placeholder="e.g. Samsung"
                maxLength={100}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode (UPC/EAN)</label>
              <input
                type="text"
                value={form.barcode}
                onChange={e => set('barcode', e.target.value)}
                placeholder="Optional"
                maxLength={50}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {!form.barcode.trim() && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Products without a barcode require 1–2 business day manual review before going live.
            </p>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe your product…"
              rows={3}
              maxLength={5000}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                    form.category === cat
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category}</p>}
          </div>

          {/* Price + Compare at price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (LRD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0.00"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compare at (LRD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.compare_at_price}
                onChange={e => set('compare_at_price', e.target.value)}
                placeholder="Original price"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Stock qty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock quantity</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.stock_qty}
              onChange={e => set('stock_qty', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fulfillment type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fulfillment</label>
            <div className="flex gap-2">
              {(['pickup', 'delivery'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('fulfillment_type', type)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    form.fulfillment_type === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || success}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating…' : success ? 'Created!' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Main page ----------

export default function ProductsPage() {
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [tab, setTab]           = useState<Tab>('all')
  const [offset, setOffset]     = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchProducts = useCallback(
    async (newOffset = 0, replace = true) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) })
        if (tab === 'pending') params.set('status', 'pending')
        const res  = await fetch(`/api/proxy/shop/seller/products?${params}`)
        const data = (await res.json()) as ProductsResponse
        const items: SellerProduct[] = data.products ?? []

        const filtered =
          tab === 'live'
            ? items.filter(p => p.is_active && (p.status === 'approved' || p.status === 'auto_approved'))
            : tab === 'inactive'
            ? items.filter(p => !p.is_active)
            : items

        setProducts(prev => (replace ? filtered : [...prev, ...filtered]))
        setTotal(data.total ?? 0)
        setOffset(newOffset)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load products')
      } finally {
        setLoading(false)
      }
    },
    [tab],
  )

  useEffect(() => {
    fetchProducts(0, true)
  }, [fetchProducts])

  function handleProductCreated() {
    setSuccessMsg('Product submitted for review.')
    fetchProducts(0, true)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your product listings</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          + Add Product
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-medium">
          {successMsg}
        </div>
      )}

      {/* Tab filter */}
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

      {loading && products.length === 0 && (
        <div className="text-gray-400 py-12 text-center">Loading products…</div>
      )}

      {!loading && products.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 font-medium">No products found</p>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'all'
              ? 'Click "Add Product" to list your first product.'
              : `No ${tab} products.`}
          </p>
          {tab === 'all' && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              + Add Product
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => (
            <div
              key={p.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4 items-start shadow-sm"
            >
              {(p.images ?? []).length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(p.images as string[])[0]}
                  alt={p.title}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center">
                  <span className="text-xs text-gray-400">No image</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 truncate">{p.title}</p>
                  <StatusBadge status={p.status} isActive={p.is_active} />
                </div>

                <div className="flex flex-wrap gap-2 mt-1 items-center">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{p.category}</span>
                  {p.variant_label && (
                    <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{p.variant_label}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="font-bold text-gray-900">{p.currency} {fmt(p.price)}</span>
                  {p.compare_at_price != null && (
                    <span className="line-through text-gray-400">{p.currency} {fmt(p.compare_at_price)}</span>
                  )}
                  {p.stock_qty > 0 ? (
                    <span className="text-green-600 font-medium">{p.stock_qty} in stock</span>
                  ) : (
                    <span className="text-red-600 font-medium">Out of stock</span>
                  )}
                  <span className="text-gray-400">{p.view_count} views</span>
                </div>
              </div>
            </div>
          ))}

          {products.length < total && (
            <button
              onClick={() => fetchProducts(offset + LIMIT, false)}
              disabled={loading}
              className="w-full py-3 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading…' : `Load more (${total - products.length} remaining)`}
            </button>
          )}
        </div>
      )}

      {showModal && (
        <AddProductModal
          onClose={() => setShowModal(false)}
          onCreated={handleProductCreated}
        />
      )}
    </div>
  )
}
