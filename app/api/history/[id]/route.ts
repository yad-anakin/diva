import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = 'diva';
const COLLECTION = 'history';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const filter = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
      : { _id: id };
    const res = await db.collection(COLLECTION).deleteOne(filter as any);
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ ok: true }, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
  } catch (err: any) {
    console.error('DELETE /api/history/[id] failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    const body = await req.json();
    const update: any = {};
    if (typeof body.buyer === 'string') update.buyer = body.buyer;
    if (typeof body.when === 'string') update.when = body.when;
    if (Array.isArray(body.serviceIds)) update.serviceIds = body.serviceIds.map(String);
    if (Array.isArray(body.employeeIds)) update.employeeIds = body.employeeIds.map(String);
    if (typeof body.currency === 'string') update.currency = body.currency;
    if (body.overrides && typeof body.overrides === 'object') update.overrides = body.overrides;
    update.updatedAt = new Date().toISOString();

    if (Object.keys(update).length === 1) { // only updatedAt
      return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const filter = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
      : { _id: id };
    const updRes = await db.collection(COLLECTION).updateOne(filter as any, { $set: update });
    if (updRes.matchedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    const value = await db.collection(COLLECTION).findOne(filter as any);
    const { _id, ...rest } = (value || {}) as any;
    const doc = value ? ({ ...rest, _id: String(_id) } as any) : { ok: true };
    return NextResponse.json(doc, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
  } catch (err: any) {
    console.error('PATCH /api/history/[id] failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
