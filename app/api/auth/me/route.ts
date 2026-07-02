import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.BACKEND_URL ?? 'https://blueboney.vercel.app/api'

export async function GET() {
  try {
    const token = (await cookies()).get('market_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const res = await fetch(`${BACKEND}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: 'Session invalid' }, { status: 401 })
    }

    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error' },
      { status: 500 },
    )
  }
}
