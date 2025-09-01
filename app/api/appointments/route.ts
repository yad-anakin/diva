import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB_NAME = 'diva';
const COLLECTION = 'appointments';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const items = await db.collection(COLLECTION).find({}).sort({ when: 1 }).toArray();
    const serialized = items.map((it: any) => ({ _id: String(it._id), ...it, _idObj: undefined }));
    // Remove any accidental _idObj field if present
    serialized.forEach((s: any) => { delete s._idObj; });
    return NextResponse.json(serialized, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
  } catch (err: any) {
    console.error('GET /api/appointments failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Basic validation
    if (!body?.buyer || !body?.when || !Array.isArray(body?.serviceIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const doc = {
      buyer: String(body.buyer),
      employeeIds: Array.isArray(body.employeeIds) ? body.employeeIds.map(String) : [],
      serviceIds: body.serviceIds.map(String),
      when: String(body.when),
      currency: body.currency ? String(body.currency) : 'IQD',
      overrides: body.overrides && typeof body.overrides === 'object' ? body.overrides : {},
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection(COLLECTION).insertOne(doc);
    return NextResponse.json({ _id: String(result.insertedId), ...doc }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('POST /api/appointments failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const res = await db.collection(COLLECTION).deleteMany({});
    return NextResponse.json({ deletedCount: res.deletedCount }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('DELETE /api/appointments failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
