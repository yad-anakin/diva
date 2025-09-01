import { NextRequest, NextResponse } from 'next/server';

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(req: NextRequest) {
  try {
    // Enforce JSON content-type to reduce risk of request smuggling/CSRF variants
    const ct = req.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return NextResponse.json({ error: 'Unsupported content-type' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    let email = typeof body.email === 'string' ? body.email.trim() : '';
    let password = typeof body.password === 'string' ? body.password : '';

    // Basic input validation
    if (!email || !password || email.length > 256 || password.length > 256) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim();
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const ok = constantTimeEqual(email, ADMIN_EMAIL) && constantTimeEqual(password, ADMIN_PASSWORD);
    if (!ok) {
      // Do not reflect attacker-controlled content or details
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set('auth', 'ok', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    // Avoid caching auth responses
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch {
    // Avoid leaking internal details
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
