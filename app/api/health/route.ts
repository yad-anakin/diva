import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const admin = client.db().admin();
    const ping = await admin.ping();

    // In development, include minimal connection diagnostics (without secrets)
    const devInfo: any = {};
    if (process.env.NODE_ENV !== 'production') {
      const uri = process.env.MONGODB_URI || '';
      // Redact credentials and surface key parts for debugging
      try {
        // Basic redaction: drop anything between '://' and '@'
        const redacted = uri.replace(/:\/\/([^@]+)@/, '://<redacted>@');
        devInfo.uri = redacted;
      } catch {
        devInfo.uri = '<unparseable>';
      }
    }

    return NextResponse.json({ ok: true, ping, ...(Object.keys(devInfo).length ? { devInfo } : {}) }, { status: 200 });
  } catch (err: any) {
    console.error('MongoDB health check failed:', err?.message || err);
    const body: any = { ok: false, error: err?.message || 'Unknown error' };
    if (process.env.NODE_ENV !== 'production') {
      body.name = err?.name;
      body.code = err?.code;
      body.stack = typeof err?.stack === 'string' ? err.stack.split('\n').slice(0, 5) : undefined;
      const uri = process.env.MONGODB_URI || '';
      try {
        const redacted = uri.replace(/:\/\/([^@]+)@/, '://<redacted>@');
        body.devInfo = { uri: redacted };
      } catch {
        body.devInfo = { uri: '<unparseable>' };
      }
    }
    return NextResponse.json(body, { status: 500 });
  }
}
