import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB_NAME = 'diva';
const COLLECTION = 'employees';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    let items = await db.collection(COLLECTION).find({}).sort({ name: 1 }).toArray();
    if (items.length === 0) {
      const defaults = [
        'Alaa','Sara','Noor','Lana','Zahra','Mira','Huda','Rasha','Dalia','Farah','Aya','Hanan','Reem','Rana','Laila','Noorhan','Bushra','Marwa','Heba','Rahma','Yasmine','Salma','Dina','Amal'
      ].map((name) => ({ name }));
      if (defaults.length) {
        await db.collection(COLLECTION).insertMany(defaults);
        items = await db.collection(COLLECTION).find({}).sort({ name: 1 }).toArray();
      }
    }
    const serialized = items.map((it: any) => ({ id: String(it._id), name: it.name }));
    return NextResponse.json(serialized, { status: 200 });
  } catch (err: any) {
    console.error('GET /api/employees failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.name) {
      return NextResponse.json({ error: 'name (string) is required' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const doc = { name: String(body.name) };
    const result = await db.collection(COLLECTION).insertOne(doc);
    return NextResponse.json({ id: String(result.insertedId), ...doc }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/employees failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const res = await db.collection(COLLECTION).deleteMany({});
    return NextResponse.json({ deletedCount: res.deletedCount }, { status: 200 });
  } catch (err: any) {
    console.error('DELETE /api/employees failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
