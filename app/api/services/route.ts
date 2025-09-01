import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB_NAME = 'diva';
const COLLECTION = 'services';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    let items = await db.collection(COLLECTION).find({}).sort({ name: 1 }).toArray();
    if (items.length === 0) {
      const defaults = [
        { name: 'سشوار الشعر', price: 15000 },
        { name: 'قص وتصفيف الشعر', price: 20000 },
        { name: 'صبغ الشعر', price: 45000 },
        { name: 'خصل ملونة', price: 60000 },
        { name: 'علاج كيراتين', price: 80000 },
        { name: 'مانيكير', price: 12000 },
        { name: 'باديكير', price: 15000 },
        { name: 'تنظيف بشرة', price: 30000 },
        { name: 'مكياج', price: 50000 },
        { name: 'تشذيب الحواجب', price: 10000 },
        { name: 'إزالة الشعر بالشمع', price: 18000 },
        { name: 'نقش حناء', price: 25000 },
        { name: 'رفع الرموش', price: 35000 },
        { name: 'تسريحة مناسبات', price: 40000 },
        { name: 'سبا فروة الرأس', price: 22000 },
      ];
      if (defaults.length) {
        await db.collection(COLLECTION).insertMany(defaults);
        items = await db.collection(COLLECTION).find({}).sort({ name: 1 }).toArray();
      }
    }
    const serialized = items.map((it: any) => ({ id: String(it._id), name: it.name, price: it.price }));
    return NextResponse.json(serialized, { status: 200 });
  } catch (err: any) {
    console.error('GET /api/services failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.name || typeof body?.price !== 'number') {
      return NextResponse.json({ error: 'name (string) and price (number) are required' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const doc = { name: String(body.name), price: Number(body.price) };
    const result = await db.collection(COLLECTION).insertOne(doc);
    return NextResponse.json({ id: String(result.insertedId), ...doc }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/services failed:', err);
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
    console.error('DELETE /api/services failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
