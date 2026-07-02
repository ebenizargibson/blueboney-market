'use client'
import { useEffect, useState } from 'react'

interface SellerInfo {
  id: string
  seller_tier: string
  status: string
  avg_rating: number | null
  ad_wallet_balance: number
}

interface CommerceDashboardKPIs {
  orders_pending: number
  orders_ready: number
  total_orders_lifetime: number
  returns_pending: number
  active_campaigns: number
  revenue_this_month: number
  revenue_this_week: number
  revenue_prev_week: number
  week_over_week_pct: number | null
  campaign_spend_active: number
}

interface DashboardResponse {
  seller: SellerInfo
  kpis: CommerceDashboardKPIs
}

function KPICard({ label, value, sub, alert }: { label: string; value: string | number; sub?: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 bg-white shadow-sm ${alert ? 'border-red-300' : 'border-gray-200'}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const TIER_BADGES: Record<string, string> = {
  bronze: '🥉 Bronze Seller',
  silver: '🥈 Silver Seller',
  gold: '⭐ Gold Seller',
  platinum: '💎 Platinum Seller',
}

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-LR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/proxy/shop/seller/dashboard')
      .then(r => r.json())
      .then(res => setData(res as DashboardResponse))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const kpis = data?.kpis ?? null
  const seller = data?.seller ?? null

  const wowPct = kpis?.week_over_week_pct
  const wowSub =
    wowPct == null
      ? undefined
      : wowPct >= 0
      ? `↑ ${wowPct.toFixed(1)}% vs last week`
      : `↓ ${Math.abs(wowPct).toFixed(1)}% vs last week`

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your seller performance at a glance</p>
        </div>
        {seller && (
          <span className="ml-auto text-sm font-medium px-3 py-1 rounded-full bg-amber-100 text-amber-800">
            {TIER_BADGES[seller.seller_tier?.toLowerCase()] ?? seller.seller_tier}
          </span>
        )}
      </div>

      {loading && <div className="text-gray-400 py-12 text-center">Loading dashboard…</div>}
      {error && <div className="text-red-600 py-4">{error}</div>}

      {kpis && seller && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <KPICard label="Orders Pending" value={kpis.orders_pending} alert={kpis.orders_pending > 0} />
          <KPICard label="Orders Ready for Pickup" value={kpis.orders_ready} alert={kpis.orders_ready > 0} />
          <KPICard label="Returns Pending" value={kpis.returns_pending} alert={kpis.returns_pending > 0} />
          <KPICard label="Revenue This Month" value={`LRD ${fmt(kpis.revenue_this_month)}`} />
          <KPICard label="Revenue This Week" value={`LRD ${fmt(kpis.revenue_this_week)}`} sub={wowSub} />
          <KPICard label="Active Campaigns" value={kpis.active_campaigns} />
          <KPICard label="Campaign Spend" value={`LRD ${fmt(kpis.campaign_spend_active)}`} />
          <KPICard label="Ad Wallet Balance" value={`LRD ${fmt(seller.ad_wallet_balance)}`} />
          <KPICard
            label="Avg Rating"
            value={seller.avg_rating != null ? `${seller.avg_rating.toFixed(1)} / 5.0` : '—'}
          />
        </div>
      )}
    </div>
  )
}
