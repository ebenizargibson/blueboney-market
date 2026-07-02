import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.BACKEND_URL ?? 'https://blueboney.vercel.app/api'

async function proxy(req: NextRequest, path: string[]) {
  const token = (await cookies()).get('market_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const url = new URL(req.url)
  const target = `${BACKEND}/${path.join('/')}${url.search}`

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
