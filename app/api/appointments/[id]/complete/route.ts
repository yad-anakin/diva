import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = 'diva';
const APPT_COLLECTION = 'appointments';
const HISTORY_COLLECTION = 'history';

// Mark an appointment as completed: move it to history and remove from appointments
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const appt = await db.collection(APPT_COLLECTION).findOne({ _id: new ObjectId(id) });
    if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    const historyDoc: any = {
      buyer: appt.buyer || '',
      employeeIds: Array.isArray(appt.employeeIds) ? appt.employeeIds.map(String) : [],
      serviceIds: Array.isArray(appt.serviceIds) ? appt.serviceIds.map(String) : [],
      when: String(appt.when),
      currency: appt.currency ? String(appt.currency) : 'IQD',
      overrides: appt.overrides && typeof appt.overrides === 'object' ? appt.overrides : {},
      createdAt: appt.createdAt || new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      sourceAppointmentId: String(appt._id),
    };

    const insertRes = await db.collection(HISTORY_COLLECTION).insertOne(historyDoc);
    await db.collection(APPT_COLLECTION).deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ _id: String(insertRes.insertedId), ...historyDoc }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/appointments/[id]/complete failed:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
