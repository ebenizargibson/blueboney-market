'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Package, Megaphone, RotateCcw, CheckSquare, LogOut, Store } from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/orders',    icon: ShoppingBag,     label: 'Orders' },
  { href: '/products',  icon: Package,          label: 'Products' },
  { href: '/campaigns', icon: Megaphone,        label: 'Ad Campaigns' },
  { href: '/returns',   icon: RotateCcw,        label: 'Returns' },
  { href: '/listings', icon: CheckSquare,      label: 'Listing Status' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const [logoutError, setLogoutError] = useState('')

  async function logout() {
    setLogoutError('')
    try {
      // Navigating to the login page is not logging out. If this request
      // fails the session cookie survives, and the user is shown a login
      // screen while still authenticated -- on a shared workstation that is
      // the whole risk. Only leave once the server has ended the session.
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (!res.ok) {
        setLogoutError('Could not sign you out. You are still signed in.')
        return
      }
    } catch {
      setLogoutError('Could not reach the server. You are still signed in.')
      return
    }
    router.push('/login')
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-[240px] flex flex-col z-40" style={{ background: 'var(--bb-ink)' }}>
      {logoutError && (
        <div role="alert" style={{
          position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999,
          maxWidth: 420, margin: '0 auto', padding: '12px 16px', borderRadius: 10,
          background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B',
          fontSize: 13, lineHeight: 1.5,
        }}>
          {logoutError}
        </div>
      )}
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <Store size={20} className="text-blue-200" />
          <span className="text-white font-bold text-[15px] tracking-tight">Blue Boney Market</span>
        </div>
        <p className="text-[11px] mt-0.5 ml-[28px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Seller Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
              style={
                active
                  ? { background: 'var(--m-blue)', color: '#fff' }
                  : { color: 'rgba(255,255,255,0.6)' }
              }
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors w-full"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
