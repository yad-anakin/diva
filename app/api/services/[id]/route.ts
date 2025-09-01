import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = 'diva';
const COLLECTION = 'services';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const update: any = {};
    if (typeof body?.name === 'string') update.name = body.name;
    if (typeof body?.price === 'number') update.price = body.price;
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const res = await db.collection(COLLECTION).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      // Support both modern and older driver options
      { returnDocument: 'after', returnOriginal: false } as any
    );
    let updated = res?.value as any | null;
    if (!updated) {
      // Fallback: fetch after update
      updated = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    }
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ id: String(updated._id), name: updated.name, price: updated.price }, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
  } catch (err: any) {
    console.error('PUT /api/services/[id] failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const res = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ deletedCount: res.deletedCount }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('DELETE /api/services/[id] failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
