"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardDrawer from "@/components/DashboardDrawer";
import EmployeeMultiSelect from "@/components/EmployeeMultiSelect";
import ServiceGrid from "@/components/ServiceGrid";
import type { Employee, Service } from "@/components/types";
import ArabicDateTimePicker from "@/components/ArabicDateTimePicker";

export type DbAppointment = {
  _id: string;
  buyer: string;
  employeeIds: string[];
  serviceIds: string[];
  when: string; // ISO
  currency: string;
  overrides: Record<string, number>;
};

export default function AppointmentPage() {
  const [buyer, setBuyer] = useState("");
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [when, setWhen] = useState<string>(() => new Date().toISOString());
  const [currency, setCurrency] = useState("IQD");
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [items, setItems] = useState<DbAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<DbAppointment | null>(null);

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
        // ignore, already handled on other pages
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedServices = useMemo(
    () => services.filter((s) => serviceIds.includes(s.id)),
    [services, serviceIds]
  );

  const total = selectedServices.reduce(
    (acc, s) => acc + (overrides[s.id] ?? s.price),
    0
  );

  const timeFmt = useMemo(() => new Intl.DateTimeFormat("ar-IQ", { hour: "2-digit", minute: "2-digit" }), []);

  // Only show appointments from today (start of day) and in the future
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const upcoming = useMemo(
    () => items.filter((it) => new Date(it.when).getTime() >= todayStart),
    [items, todayStart]
  );

  const handlePriceChange = (id: string, val: string) => {
    const num = Number(val.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(num)) setOverrides((o) => ({ ...o, [id]: num }));
  };

  const toggleService = (id: string) => {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addAppointment = async () => {
    if (!buyer || !when || serviceIds.length === 0) return;
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer, employeeIds, serviceIds, when, currency, overrides }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created: DbAppointment = await res.json();
      setItems((prev) => [...prev, created].sort((a, b) => +new Date(a.when) - +new Date(b.when)));
      // reset minimal
      setBuyer("");
      setEmployeeIds([]);
      setServiceIds([]);
      setOverrides({});
    } catch (e) {
      console.error(e);
      alert("تعذر حفظ الموعد. حاول مرة أخرى.");
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
            <span className="text-diva-deep font-bold">د</span>
          </div>
          <div>
            <div className="text-xl font-extrabold text-diva-deep">حجز موعد</div>
            <div className="text-sm text-pink-600">إنشاء وإدارة الحجوزات القادمة</div>
          </div>
        </div>
        <button className="btn btn-outline" onClick={() => setDrawerOpen(true)}>لوحة التحكم</button>
      </header>

      <section className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">اسم الزبونة</label>
            <input
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              placeholder="أدخلي اسم الزبونة"
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">التاريخ والوقت</label>
            <button type="button" onClick={() => setCalendarOpen(true)} className="w-full border rounded-xl px-3 py-2 text-right hover:bg-pink-50">
              {new Intl.DateTimeFormat("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(when))}
            </button>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">العملة</label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">الموظفات</label>
          <EmployeeMultiSelect employees={employees} selectedIds={employeeIds} onChange={setEmployeeIds} />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">الخدمات</label>
          <ServiceGrid services={services} selectedIds={serviceIds} onToggle={toggleService} />
        </div>

        {selectedServices.length > 0 && (
          <div className="border-t pt-3">
            <div className="font-medium mb-2">الخدمات المختارة</div>
            <div className="space-y-2">
              {selectedServices.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">الافتراضي: IQD {s.price.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">السعر</span>
                    <input
                      inputMode="decimal"
                      value={overrides[s.id] ?? s.price}
                      onChange={(e) => handlePriceChange(s.id, e.target.value)}
                      className="w-28 border rounded-xl px-3 py-1 text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-lg font-semibold">
              <span>المجموع</span>
              <span>
                {(() => {
                  try {
                    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(total);
                  } catch {
                    return `${currency} ${total.toLocaleString()}`;
                  }
                })()}
              </span>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button onClick={addAppointment} className="btn btn-primary w-full">حفظ الموعد</button>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">المواعيد القادمة</div>
          <div className="text-xs text-gray-500">{upcoming.length}</div>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">جاري التحميل...</div>
        ) : error ? (
          <div className="text-sm text-red-600">خطأ في التحميل: {error}</div>
        ) : upcoming.length === 0 ? (
          <div className="text-sm text-gray-500">لا توجد مواعيد بعد.</div>
        ) : (
          <ul className="divide-y divide-pink-50">
            {upcoming.map((it) => {
              const d = new Date(it.when);
              const dayStart = new Date(d);
              dayStart.setHours(0, 0, 0, 0);
              const isToday = dayStart.getTime() === todayStart;
              const sList: Service[] = services.filter((s) => it.serviceIds.includes(s.id));
              const eList: Employee[] = employees.filter((e) => it.employeeIds.includes(e.id));
              const total = sList.reduce((acc, s) => acc + (it.overrides[s.id] ?? s.price), 0);
              return (
                <li key={it._id} className={`py-3 ${isToday ? 'bg-yellow-50 rounded-lg' : ''}`}>
                  <div className="flex items-start justify-between gap-3 cursor-pointer hover:bg-pink-50/40 px-2 rounded" onClick={() => setSelectedAppt(it)} title="عرض التفاصيل">
                    <div>
                      <div className="font-medium">{it.buyer}</div>
                      <div className="text-xs text-gray-500">{new Date(it.when).toLocaleString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
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
                        <button onClick={() => removeAppointment(it._id)} className="text-xs text-red-600 hover:underline">حذف</button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
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
                        const price = selectedAppt.overrides?.[sid] ?? s?.price ?? 0;
                        let priceFmt = `${selectedAppt.currency || 'IQD'} ${price.toLocaleString()}`;
                        try { priceFmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: selectedAppt.currency || 'IQD' }).format(price); } catch {}
                        return (
                          <li key={sid} className="text-sm">
                            {s ? `${s.name} - ${priceFmt}` : sid}
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
                        return new Intl.NumberFormat(undefined, { style: 'currency', currency: selectedAppt.currency || 'IQD' }).format(total);
                      } catch {
                        return `${selectedAppt.currency || 'IQD'} ${total.toLocaleString()}`;
                      }
                    })()}
                  </div>
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
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-diva-deep">التاريخ والوقت</div>
                <button className="btn btn-outline" onClick={() => setCalendarOpen(false)}>إغلاق</button>
              </div>
              <ArabicDateTimePicker inline value={when} onChange={setWhen} />
            </div>
          </div>
        </div>
      )}
      <DashboardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  );
}
