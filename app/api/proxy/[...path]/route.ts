import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.BACKEND_URL ?? 'https://blueboney.vercel.app/api'

async function proxy(req: NextRequest, path: string[]) {
  const token = (await cookies()).get('market_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // The proxy forwards whatever path it is given, with the seller's token
  // attached. That token is an ordinary customer session, so backend routes still
  // enforce their own authorisation — admin and CS endpoints refuse it, which I
  // checked rather than assumed. But a seller portal has no business being a
  // general tunnel into every API: it widens the blast radius of a stolen
  // market_token from "this seller's shop" to "everything this person can do,
  // including their wallet and transaction history".
  //
  // So only the prefixes the portal actually calls are forwarded. Anything else
  // is refused here rather than relying on the far end to decline.
  const requested = path.join('/')

  const ALLOWED_PREFIXES = [
    'shop/',                        // seller dashboard, products, orders, returns, ads
    'admin/marketplace/products',   // the marketplace catalogue view the portal embeds
  ]

  if (!ALLOWED_PREFIXES.some(prefix => requested === prefix.replace(/\/$/, '') || requested.startsWith(prefix))) {
    return NextResponse.json({ error: 'not_proxyable', path: requested }, { status: 403 })
  }

  // A traversal segment cannot escape the API prefix today — the backend answers
  // 404 — but normalising here means that does not depend on the far end's
  // behaviour staying the same.
  if (path.some(seg => seg === '..' || seg.includes('%2e%2e') || seg.includes('\\'))) {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 })
  }

  const url = new URL(req.url)
  const target = `${BACKEND}/${requested}${url.search}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const body =
    req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined

  const res = await fetch(target, { method: req.method, headers, body })

  if (res.status === 401) {
    const r = NextResponse.json({ error: 'Session expired' }, { status: 401 })
    r.cookies.set('market_token', '', { maxAge: 0, path: '/' })
    return r
  }

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

type Params = Promise<{ path: string[] }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  return proxy(req, (await params).path)
}
export async function POST(req: NextRequest, { params }: { params: Params }) {
  return proxy(req, (await params).path)
}
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  return proxy(req, (await params).path)
}
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  return proxy(req, (await params).path)
}
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  return proxy(req, (await params).path)
}
