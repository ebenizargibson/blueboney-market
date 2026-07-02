'use client'
import { useEffect, useState } from 'react'

interface Campaign {
  id: string
  status: string
  campaign_type: string
  bid_amount: number
  budget_total: number
  spent_total: number
  start_date: string | null
  end_date: string | null
  created_at: string
  impressions: number
  clicks: number
  ctr: number
  spend: number
}

interface CampaignsResponse {
  campaigns: Campaign[]
  ad_wallet_balance: number
}

const STATUS_PILL: Record<string, string> = {
  active:    'bg-green-100 text-green-800',
  paused:    'bg-amber-100 text-amber-800',
  completed: 'bg-gray-100 text-gray-600',
  draft:     'bg-gray-100 text-gray-500',
}

function fmt(amount: number, decimals = 0): string {
  return new Intl.NumberFormat('en-LR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adBalance, setAdBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/proxy/shop/ads/campaigns')
      .then(r => r.json())
      .then((res: CampaignsResponse) => {
        setCampaigns(res.campaigns ?? [])
        setAdBalance(res.ad_wallet_balance ?? null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage your advertising campaigns</p>
        </div>
        {adBalance != null && (
          <div className="ml-auto text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
            Ad Balance: LRD {fmt(adBalance)}
          </div>
        )}
      </div>

      {loading && <div className="text-gray-400 py-12 text-center">Loading…</div>}
      {error && <div className="text-red-600 py-4">{error}</div>}

      {!loading && !error && campaigns.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-400 text-sm">No campaigns yet.</p>
          <p className="text-gray-300 text-xs mt-1">Create a campaign from the mobile app to get started.</p>
        </div>
      )}

      {!loading && campaigns.length > 0 && (
        <div className="space-y-4">
          {campaigns.map(c => {
            const ctrPct = (c.ctr * 100).toFixed(2)
            const pillClass = STATUS_PILL[c.status] ?? 'bg-gray-100 text-gray-500'
            const typeLabel = c.campaign_type
              .split('_')
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')

            return (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{typeLabel}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pillClass}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">#{c.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      LRD {fmt(c.spent_total)} spent of LRD {fmt(c.budget_total)} total
                    </p>
                    {c.budget_total > 0 && (
                      <div className="mt-1 h-1.5 w-40 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, (c.spent_total / c.budget_total) * 100).toFixed(1)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Impressions</p>
                    <p className="text-lg font-semibold text-gray-900 mt-0.5">{fmt(c.impressions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Clicks</p>
                    <p className="text-lg font-semibold text-gray-900 mt-0.5">{fmt(c.clicks)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">CTR</p>
                    <p className="text-lg font-semibold text-gray-900 mt-0.5">{ctrPct}%</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Bid per click: <span className="font-medium text-gray-700">LRD {fmt(c.bid_amount, 2)} CPC</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
