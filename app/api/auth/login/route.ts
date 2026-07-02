import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'https://blueboney.vercel.app/api'

// Stable device fingerprint for browser sessions
const WEB_DEVICE = {
  device_id: 'web-seller-portal',
  device_name: 'Blue Boney Market Web',
  device_model: 'Browser',
  device_platform: 'web',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Step 2: verify OTP for new device
    if (body.temp_token && body.otp) {
      const res = await fetch(`${BACKEND}/auth/verify-login-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_token: body.temp_token,
          code: body.otp,
          ...WEB_DEVICE,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        return NextResponse.json({ error: data.error ?? 'OTP verification failed' }, { status: res.status })
      }

      // Issue session cookie
      const response = NextResponse.json({ success: true, user: data.user })
      response.cookies.set('market_token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
      return response
    }

    // Step 1: phone + password login
    const { phone, password } = body
    if (!phone || !password) {
      return NextResponse.json({ error: 'phone and password are required' }, { status: 400 })
    }

    const res = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, ...WEB_DEVICE }),
    })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? 'Login failed' }, { status: res.status })
    }

    // Known device — got token directly
    if (data.token) {
      const response = NextResponse.json({ success: true, user: data.user })
      response.cookies.set('market_token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return response
    }

    // New device — OTP required
    // { next: 'verify_device', temp_token, phone_masked }
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Login error' },
      { status: 500 },
    )
  }
}
