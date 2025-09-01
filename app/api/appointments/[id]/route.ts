import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = 'diva';
const COLLECTION = 'appointments';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();
    const update: any = {};
    if (typeof body?.buyer === 'string') update.buyer = body.buyer;
    if (typeof body?.when === 'string') update.when = body.when;
    if (Array.isArray(body?.serviceIds)) update.serviceIds = body.serviceIds.map(String);
    if (Array.isArray(body?.employeeIds)) update.employeeIds = body.employeeIds.map(String);
    if (typeof body?.currency === 'string') update.currency = body.currency;
    if (body?.overrides && typeof body.overrides === 'object') update.overrides = body.overrides;
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const res = await db.collection(COLLECTION).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after', returnOriginal: false } as any
    );
    let updated = res?.value as any | null;
    if (!updated) {
      updated = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    }
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ _id: String(updated._id), ...updated, _idObj: undefined }, { status: 200 });
  } catch (err: any) {
    console.error('PUT /api/appointments/[id] failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const res = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ deletedCount: res.deletedCount }, { status: 200 });
  } catch (err: any) {
    console.error('DELETE /api/appointments/[id] failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
