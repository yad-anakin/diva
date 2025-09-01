"use client";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import type { Employee, Service } from "@/components/types";
import ArabicDateTimePicker from "@/components/ArabicDateTimePicker";
import DashboardDrawer from "@/components/DashboardDrawer";
import ServiceGrid from "@/components/ServiceGrid";
import EmployeeMultiSelect from "@/components/EmployeeMultiSelect";
import Receipt, { type ReceiptData } from "@/components/Receipt";

export type DbAppointment = {
  _id: string;
  buyer: string;
  employeeIds: string[];
  serviceIds: string[];
  when: string; // ISO
  currency: string;
  overrides: Record<string, number>;
};

export default function SavedAppointmentsPage() {
  const [items, setItems] = useState<DbAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<DbAppointment | null>(null);
  const [editBuyer, setEditBuyer] = useState("");
  const [editWhenISO, setEditWhenISO] = useState<string>(new Date().toISOString());
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [editEmployeeIds, setEditEmployeeIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);
  const [editEmployeesOpen, setEditEmployeesOpen] = useState(false);
  const [savingToHistory, setSavingToHistory] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<DbAppointment | null>(null);
  const [printingOneId, setPrintingOneId] = useState<string | null>(null);
  const todayLocal = new Date();
  const yyyy = todayLocal.getFullYear();
  const mm = String(todayLocal.getMonth() + 1).padStart(2, "0");
  const dd = String(todayLocal.getDate()).padStart(2, "0");
  const [selectedDay, setSelectedDay] = useState<string>(`${yyyy}-${mm}-${dd}`);
  // Helper to map ISO -> YYYY-MM-DD in local time
  const isoToLocalDateKey = (iso: string) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  async function fetchAppointments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DbAppointment[] = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [sRes, eRes] = await Promise.all([
          fetch("/api/services", { cache: "no-store" }),
          fetch("/api/employees", { cache: "no-store" }),
        ]);
        if (!sRes.ok || !eRes.ok) return;
        const [s, e] = await Promise.all([sRes.json(), eRes.json()]);
        if (mounted) {
          setServices(s);
          setEmployees(e);
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const sorted = useMemo(
    () => [...items].sort((a, b) => +new Date(a.when) - +new Date(b.when)),
    [items]
  );

  // Filter by selected day (local date)
  const filtered = useMemo(() => {
    return sorted.filter((it) => {
      const d = new Date(it.when);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${day}`;
      return key === selectedDay;
    });
  }, [sorted, selectedDay]);

  // Build set of dates that have at least one appointment (YYYY-MM-DD)
  const highlightedDateKeys = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const d = new Date(it.when);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      set.add(`${y}-${m}-${day}`);
    }
    return set;
  }, [items]);

  const timeFmt = useMemo(() => new Intl.DateTimeFormat("ar-IQ", { hour: "2-digit", minute: "2-digit" }), []);

  const buildReceiptData = (appt: DbAppointment): ReceiptData => {
    const svcs = (appt.serviceIds || [])
      .map((sid) => services.find((s) => s.id === sid))
      .filter(Boolean) as Service[];
    const emps = (appt.employeeIds || [])
      .map((eid) => employees.find((e) => e.id === eid))
      .filter(Boolean) as Employee[];
    return {
      buyer: appt.buyer || "-",
      currency: appt.currency || "IQD",
      employees: emps,
      services: svcs,
      overrides: appt.overrides || {},
      when: appt.when,
    };
  };

  const printOne = async (appt: DbAppointment) => {
    setPrintingOneId(appt._id);
    setTimeout(() => {
      window.print();
      setPrintingOneId(null);
    }, 50);
  };

  const openEdit = (it: DbAppointment) => {
    setEditing(it);
    setEditBuyer(it.buyer || "");
    setEditWhenISO(it.when);
    setEditServiceIds([...it.serviceIds]);
    setEditEmployeeIds([...it.employeeIds]);
    setEditError(null);
  };

  const toggleService = (id: string) => {
    setEditServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      setSavingEdit(true);
      setEditError(null);
      const res = await fetch(`/api/appointments/${editing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer: editBuyer,
          when: editWhenISO,
          serviceIds: editServiceIds,
          employeeIds: editEmployeeIds,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: DbAppointment = await res.json();
      setItems((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      setEditing(null);
    } catch (e: any) {
      setEditError(e?.message || "فشل حفظ التعديلات");
    } finally {
      setSavingEdit(false);
    }
  };

  const saveToHistory = async (id?: string) => {
    try {
      setSavingToHistory(true);
      setEditError(null);
      // If invoked from edit modal, persist edits first
      const targetId = id || editing?._id;
      if (!targetId) return;
      if (editing && !id) {
        // persist changes
        const resUpdate = await fetch(`/api/appointments/${editing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyer: editBuyer,
            when: editWhenISO,
            serviceIds: editServiceIds,
            employeeIds: editEmployeeIds,
          }),
        });
        if (!resUpdate.ok) throw new Error(`HTTP ${resUpdate.status}`);
      }
      // complete (move to history)
      const res = await fetch(`/api/appointments/${targetId}/complete`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // remove from local list
      setItems((prev) => prev.filter((p) => p._id !== targetId));
      if (editing && !id) setEditing(null);
    } catch (e: any) {
      setEditError(e?.message || "تعذر الحفظ في السجل");
    } finally {
      setSavingToHistory(false);
    }
  };

  const removeAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (e) {
      console.error(e);
      alert("تعذر حذف الموعد.");
    }
  };

  

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-diva-pink/20 grid place-items-center">
            <span className="text-diva-deep font-bold">💾</span>
          </div>
          <div>
            <div className="text-xl font-extrabold text-diva-deep">المواعيد المحفوظة</div>
            <div className="text-sm text-pink-600">عرض حجوزات يوم: {selectedDay}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDrawerOpen(true)} className="btn btn-outline">لوحة التحكم</button>
          <button onClick={() => setCalendarOpen(true)} className="btn btn-outline">📅 اختر يوم</button>
          <Link href="/appointment" className="btn btn-outline">حجز موعد</Link>
        </div>
      </header>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">الإجمالي</div>
          <div className="text-xs text-gray-500">{filtered.length}</div>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">جاري التحميل...</div>
        ) : error ? (
          <div className="text-sm text-red-600">خطأ في التحميل: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-500">لا توجد مواعيد محفوظة.</div>
        ) : (
          <>
            <ul className="divide-y divide-pink-50">
              {filtered.map((it) => {
                const sList: Service[] = services.filter((s) => it.serviceIds.includes(s.id));
                const eList: Employee[] = employees.filter((e) => it.employeeIds.includes(e.id));
                const total = sList.reduce((acc, s) => acc + (it.overrides[s.id] ?? s.price), 0);
                return (
                  <li key={it._id} className="py-3">
                    <div className="flex items-start justify-between gap-3 cursor-pointer hover:bg-pink-50/40 px-2 rounded" onClick={() => setSelectedAppt(it)} title="عرض التفاصيل">
                      <div>
                        <div className="font-medium">{it.buyer || "-"}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(it.when).toLocaleString("ar-IQ", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {sList.map((s) => s.name).join(", ") || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          الموظفات: {eList.map((e) => e.name).join(", ") || "-"}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">
                          {(() => {
                            try {
                              return new Intl.NumberFormat(undefined, { style: "currency", currency: it.currency }).format(total);
                            } catch {
                              return `${it.currency} ${total.toLocaleString()}`;
                            }
                          })()}
                        </div>
                        <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openEdit(it)} className="text-xs text-pink-700 hover:underline">تعديل</button>
                          <button onClick={() => saveToHistory(it._id)} className="text-xs text-pink-700 hover:underline">حفظ في السجل</button>
                          <button onClick={() => removeAppointment(it._id)} className="text-xs text-pink-700 hover:underline">حذف</button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {/* Removed Clear All button as requested */}
          </>
        )}
      </section>

      {/* Details modal */}
      {selectedAppt && (
        <div className="fixed inset-0 z-[1050]">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedAppt(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-diva-deep">تفاصيل الموعد</div>
                <button className="btn btn-outline" onClick={() => setSelectedAppt(null)}>إغلاق</button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500">الاسم</div>
                  <div className="font-medium">{selectedAppt.buyer && selectedAppt.buyer.trim() ? selectedAppt.buyer : "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">التاريخ</div>
                    <div>{new Date(selectedAppt.when).toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">الوقت</div>
                    <div>{timeFmt.format(new Date(selectedAppt.when))}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">الخدمات</div>
                  {selectedAppt.serviceIds && selectedAppt.serviceIds.length > 0 ? (
                    <ul className="list-disc pr-5 space-y-1">
                      {selectedAppt.serviceIds.map((sid) => {
                        const s = services.find((x) => x.id === sid);
                        return (
                          <li key={sid} className="text-sm">
                            {s ? `${s.name} - ${(() => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: selectedAppt.currency || 'IQD' }).format((selectedAppt.overrides?.[sid] ?? s.price)); } catch { return `${selectedAppt.currency || 'IQD'} ${(selectedAppt.overrides?.[sid] ?? s.price).toLocaleString()}` } })()}` : sid}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-500">لا توجد خدمات</div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">الموظفات</div>
                  {selectedAppt.employeeIds && selectedAppt.employeeIds.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {selectedAppt.employeeIds.map((eid) => {
                        const emp = employees.find((x) => x.id === eid);
                        return (
                          <li key={eid} className="px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-sm">
                            {emp ? emp.name : eid}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-500">لا توجد موظفات محددات</div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t pt-3 mt-2">
                  <div className="text-sm text-gray-600">الإجمالي</div>
                  <div className="font-semibold">
                    {(() => {
                      const total = (selectedAppt.serviceIds || []).reduce((acc, sid) => {
                        const s = services.find((x) => x.id === sid);
                        const price = selectedAppt.overrides?.[sid] ?? s?.price ?? 0;
                        return acc + price;
                      }, 0);
                      try {
                        return new Intl.NumberFormat(undefined, { style: "currency", currency: selectedAppt.currency || "IQD" }).format(total);
                      } catch {
                        return `${selectedAppt.currency || "IQD"} ${total.toLocaleString()}`;
                      }
                    })()}
                  </div>
                </div>

                <div className="text-right">
                  <button className="btn btn-primary" onClick={() => printOne(selectedAppt)}>طباعة</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {calendarOpen && (
        <div className="fixed inset-0 z-[1000]">
          <div className="fixed inset-0 bg-black/50" onClick={() => setCalendarOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl">
              <div className="text-lg font-semibold mb-3 text-diva-deep">اختر اليوم</div>
              <ArabicDateTimePicker
                inline
                value={new Date(`${selectedDay}T12:00:00`).toISOString()}
                onChange={(iso) => setSelectedDay(isoToLocalDateKey(iso))}
                highlightedDates={highlightedDateKeys}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button className="btn btn-outline" onClick={() => setCalendarOpen(false)}>إلغاء</button>
                <button className="btn btn-primary" onClick={() => setCalendarOpen(false)}>تم</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editCalendarOpen && (
        <div className="fixed inset-0 z-[1100]" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditCalendarOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl">
              <div className="text-lg font-semibold mb-3 text-diva-deep">اختر التاريخ والوقت</div>
              <ArabicDateTimePicker
                value={editWhenISO}
                onChange={(iso) => setEditWhenISO(iso)}
                highlightedDates={highlightedDateKeys}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button className="btn btn-outline" onClick={() => setEditCalendarOpen(false)}>إلغاء</button>
                <button className="btn btn-primary" onClick={() => setEditCalendarOpen(false)}>تم</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editEmployeesOpen && (
        <div className="fixed inset-0 z-[1100]" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditEmployeesOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold text-diva-deep">اختيار الموظفات</div>
                <button className="btn btn-outline" onClick={() => setEditEmployeesOpen(false)}>إغلاق</button>
              </div>
              <div className="pr-1">
                <EmployeeMultiSelect forceOpen employees={employees} selectedIds={editEmployeeIds} onChange={setEditEmployeeIds} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="btn btn-outline" onClick={() => setEditEmployeesOpen(false)}>إلغاء</button>
                <button className="btn btn-primary" onClick={() => setEditEmployeesOpen(false)}>تم</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[1000]">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditing(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-diva-deep">تعديل الموعد</div>
                <button className="btn btn-outline" onClick={() => setEditing(null)}>إغلاق</button>
              </div>
              {editError && <div className="text-sm text-red-600">{editError}</div>}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">الزبونة</label>
                  <input value={editBuyer} onChange={(e) => setEditBuyer(e.target.value)} className="w-full border rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">التاريخ والوقت</label>
                  <button type="button" onClick={() => setEditCalendarOpen(true)} className="w-full border rounded-xl px-3 py-2 text-right hover:bg-pink-50">
                    {new Intl.DateTimeFormat("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(editWhenISO))}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-2">الخدمات</label>
                <div className="max-h-64 overflow-y-auto pr-1">
                  <ServiceGrid services={services} selectedIds={editServiceIds} onToggle={toggleService} />
                </div>
                {/* Selected services summary */}
                <div className="mt-3 space-y-2">
                  {editServiceIds.length > 0 ? (
                    <>
                      <div className="text-xs text-gray-500">الخدمات المختارة</div>
                      <ul className="list-disc pr-5 space-y-1">
                        {editServiceIds.map((sid) => {
                          const s = services.find((x) => x.id === sid);
                          const price = (editing?.overrides?.[sid] ?? s?.price ?? 0);
                          let priceFmt = `${editing?.currency || 'IQD'} ${price.toLocaleString()}`;
                          try { priceFmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: editing?.currency || 'IQD' }).format(price); } catch {}
                          return (
                            <li key={sid} className="text-sm">
                              {s ? `${s.name} - ${priceFmt}` : sid}
                            </li>
                          );
                        })}
                      </ul>
                      <div className="flex items-center justify-between border-t pt-2 mt-2">
                        <div className="text-sm text-gray-600">الإجمالي</div>
                        <div className="font-semibold">
                          {(() => {
                            const total = editServiceIds.reduce((acc, sid) => {
                              const svc = services.find((x) => x.id === sid);
                              return acc + (editing?.overrides?.[sid] ?? svc?.price ?? 0);
                            }, 0);
                            try {
                              return new Intl.NumberFormat(undefined, { style: 'currency', currency: editing?.currency || 'IQD' }).format(total);
                            } catch {
                              return `${editing?.currency || 'IQD'} ${total.toLocaleString()}`;
                            }
                          })()}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">لا توجد خدمات محددة</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-2">الموظفات</label>
                <button type="button" onClick={() => setEditEmployeesOpen(true)} className="w-full border rounded-xl px-3 py-2 text-right hover:bg-pink-50 flex items-center justify-between">
                  <span>
                    {editEmployeeIds.length ? `${editEmployeeIds.length} مختارة` : "اختيار الموظفات"}
                  </span>
                  <svg className="w-4 h-4 text-pink-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.19l3.71-3.96a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <button className="btn btn-outline" onClick={() => setEditing(null)}>إلغاء</button>
                <button className="btn btn-outline" onClick={() => saveToHistory()} disabled={savingToHistory}>{savingToHistory ? "جاري الحفظ..." : "حفظ في السجل"}</button>
                <button className="btn btn-primary" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "جاري التحديث..." : "تحديث"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <DashboardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Hidden printable areas */}
      <div className="hidden print:block">
        {printingOneId && (
          <div>
            {(() => {
              const ap = items.find((x) => x._id === printingOneId);
              if (!ap) return null;
              const data = buildReceiptData(ap);
              return <Receipt data={data} />;
            })()}
          </div>
        )}
      </div>
    </main>
  );
}
