"use client";
import { useEffect, useMemo, useState } from "react";
import ArabicDateTimePicker from "@/components/ArabicDateTimePicker";
import DashboardDrawer from "@/components/DashboardDrawer";
import Receipt, { type ReceiptData } from "@/components/Receipt";
import EmployeeMultiSelect from "@/components/EmployeeMultiSelect";
import ServiceGrid from "@/components/ServiceGrid";

type Appt = {
  _id: string;
  buyer?: string;
  when: string; // ISO
  serviceIds?: string[];
  employeeIds?: string[];
  currency?: string;
  overrides?: Record<string, number>;
  createdAt?: string;
};

type Service = { id: string; name: string; price: number };
type Employee = { id: string; name: string };

export default function HistoryPage() {
  const [selectedISO, setSelectedISO] = useState<string>(() => new Date().toISOString());
  const [items, setItems] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<Appt | null>(null);
  const [printingAll, setPrintingAll] = useState(false);
  const [printingOneId, setPrintingOneId] = useState<string | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appt | null>(null);
  const [editBuyer, setEditBuyer] = useState<string>("");
  const [editWhen, setEditWhen] = useState<string>("");
  const [editCurrency, setEditCurrency] = useState<string>("IQD");
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [editEmployeeIds, setEditEmployeeIds] = useState<string[]>([]);
  const [editOverrides, setEditOverrides] = useState<Record<string, number>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appt | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const dayRange = useMemo(() => {
    const d = new Date(selectedISO);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, [selectedISO]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Appt[] = await res.json();
      const filtered = data
        .filter((a) => a.when >= dayRange.startISO && a.when < dayRange.endISO)
        .sort((a, b) => a.when.localeCompare(b.when));
      setItems(filtered);
    } catch (e: any) {
      setError(e?.message || "فشل التحميل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await reload();
    })();
    return () => {
      mounted = false;
    };
  }, [dayRange.startISO, dayRange.endISO]);

  // Load master data for resolving names
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [sRes, eRes] = await Promise.all([
          fetch("/api/services", { cache: "no-store" }),
          fetch("/api/employees", { cache: "no-store" }),
        ]);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (mounted) setServices(sData);
        }
        if (eRes.ok) {
          const eData = await eRes.json();
          if (mounted) setEmployees(eData);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const timeFmt = useMemo(() => new Intl.DateTimeFormat("ar-IQ", { hour: "2-digit", minute: "2-digit" }), []);

  const buildReceiptData = (appt: Appt): ReceiptData => {
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

  const printOne = async (appt: Appt) => {
    setPrintingOneId(appt._id);
    // wait a tick for hidden content to render
    setTimeout(() => {
      window.print();
      setPrintingOneId(null);
    }, 50);
  };

  const printAll = async () => {
    setPrintingAll(true);
    setTimeout(() => {
      window.print();
      setPrintingAll(false);
    }, 50);
  };

  const startEdit = (appt: Appt) => {
    setActionError(null);
    setEditingAppt(appt);
    setEditBuyer(appt.buyer || "");
    // convert ISO to local datetime-local value
    const d = new Date(appt.when);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditWhen(local);
    setEditCurrency(appt.currency || "IQD");
    setEditServiceIds([...(appt.serviceIds || [])]);
    setEditEmployeeIds([...(appt.employeeIds || [])]);
    setEditOverrides({ ...(appt.overrides || {}) });
  };

  const saveEdit = async () => {
    if (!editingAppt) return;
    if (editSaving) return;
    setEditSaving(true);
    setActionError(null);
    try {
      const newISO = new Date(editWhen).toISOString();
      const res = await fetch(`/api/history/${editingAppt._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer: editBuyer,
          when: newISO,
          currency: editCurrency,
          serviceIds: editServiceIds,
          employeeIds: editEmployeeIds,
          overrides: editOverrides,
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await reload();
      setEditingAppt(null);
    } catch (e: any) {
      setActionError(e?.message || 'تعذر الحفظ');
    } finally {
      setEditSaving(false);
    }
  };

  const openDelete = (appt: Appt) => {
    setActionError(null);
    setDeleteTarget(appt);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/history/${deleteTarget._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await reload();
      if (selectedAppt && selectedAppt._id === deleteTarget._id) setSelectedAppt(null);
      setDeleteTarget(null);
    } catch (e: any) {
      setActionError(e?.message || 'تعذر الحذف');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <div className="no-print">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-diva-deep">سجل الزبونات</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCalendarOpen(true)}
            className="btn btn-outline"
            title="اختر التاريخ"
          >
            التقويم
          </button>
          <button
            onClick={printAll}
            className="btn btn-outline"
            title="طباعة كل الزبونات لليوم"
            disabled={items.length === 0}
          >
            طباعة الكل
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="btn btn-outline"
            title="لوحة التحكم"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            لوحة التحكم
          </button>
        </div>
      </header>

      {/* Calendar modal popup */}
      {calendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCalendarOpen(false)} />
          <div className="relative z-10 w-full max-w-md card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-diva-deep">اختر التاريخ</div>
              <button className="btn btn-outline" onClick={() => setCalendarOpen(false)}>إغلاق</button>
            </div>
            <ArabicDateTimePicker inline value={selectedISO} onChange={(v) => { setSelectedISO(v); }} />
            <div className="mt-3 text-right">
              <button className="btn btn-primary" onClick={() => setCalendarOpen(false)}>تم</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingAppt && (
        <div className="fixed inset-0 z-[1000]">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditingAppt(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-diva-deep">تعديل السجل</div>
                <button className="btn btn-outline" onClick={() => setEditingAppt(null)}>إغلاق</button>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">اسم الزبونة</label>
                <input
                  value={editBuyer}
                  onChange={(e) => setEditBuyer(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2"
                  placeholder="أدخلي اسم الزبونة"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">التاريخ والوقت</label>
                <input
                  type="datetime-local"
                  value={editWhen}
                  onChange={(e) => setEditWhen(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">العملة</label>
                <input
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value.toUpperCase())}
                  className="w-full border rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">الموظفات</label>
                <EmployeeMultiSelect
                  employees={employees}
                  selectedIds={editEmployeeIds}
                  onChange={setEditEmployeeIds}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">الخدمات</label>
                <ServiceGrid
                  services={services}
                  selectedIds={editServiceIds}
                  onToggle={(id) => setEditServiceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
                />
              </div>
              {editServiceIds.length > 0 && (
                <div className="border-t pt-3">
                  <div className="font-medium mb-2">الخدمات المختارة</div>
                  <div className="space-y-2">
                    {services.filter((s) => editServiceIds.includes(s.id)).map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-gray-500" suppressHydrationWarning>الافتراضي: IQD {new Intl.NumberFormat('ar-IQ').format(s.price)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">السعر</span>
                          <input
                            inputMode="decimal"
                            value={editOverrides[s.id] ?? s.price}
                            onChange={(e) => {
                              const num = Number(e.target.value.replace(/[^0-9.]/g, ""));
                              if (Number.isFinite(num)) setEditOverrides((o) => ({ ...o, [s.id]: num }));
                            }}
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
                        const total = services.filter((s) => editServiceIds.includes(s.id)).reduce((acc, s) => acc + (editOverrides[s.id] ?? s.price), 0);
                        try {
                          return new Intl.NumberFormat('ar-IQ', { style: "currency", currency: editCurrency }).format(total);
                        } catch {
                          return `${editCurrency} ${new Intl.NumberFormat('ar-IQ').format(total)}`;
                        }
                      })()}
                    </span>
                  </div>
                </div>
              )}
              {actionError && <div className="text-sm text-red-600">{actionError}</div>}
              <div className="text-right">
                <button
                  className="btn btn-primary"
                  onClick={saveEdit}
                  disabled={editSaving}
                  title="حفظ التعديلات"
                >
                  {editSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-diva-deep">الزبونات في اليوم المختار</div>
          <div className="text-sm text-gray-600">العدد: {items.length}</div>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">جاري التحميل...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">لا توجد سجلات لهذا اليوم.</div>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li
                key={it._id}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-pink-50/40 px-2 rounded"
                onClick={() => setSelectedAppt(it)}
                title="عرض التفاصيل"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-pink-50 text-diva-deep">👤</span>
                  <div>
                    <div className="font-medium">{it.buyer && it.buyer.trim() ? it.buyer : "-"}</div>
                    <div className="text-xs text-gray-500" suppressHydrationWarning>{new Intl.DateTimeFormat("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(it.when))}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-700">{timeFmt.format(new Date(it.when))}</div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={(e) => { e.stopPropagation(); printOne(it); }}
                    title="طباعة الزبونة"
                  >
                    طباعة
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={(e) => { e.stopPropagation(); startEdit(it); }}
                    title="تعديل السجل"
                  >
                    تعديل
                  </button>
                  <button
                    className="btn btn-outline btn-sm text-red-600 border-red-300"
                    onClick={(e) => { e.stopPropagation(); openDelete(it); }}
                    title="حذف السجل"
                  >
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Dashboard Drawer */}
      <DashboardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Details modal */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedAppt(null)} />
          <div className="relative z-10 w-full max-w-lg card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-diva-deep">تفاصيل الزبونة</div>
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
                  <div suppressHydrationWarning>{new Intl.DateTimeFormat("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(selectedAppt.when))}</div>
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
                          {s ? `${s.name} - ${new Intl.NumberFormat('ar-IQ', { style: "currency", currency: selectedAppt.currency || "IQD" }).format((selectedAppt.overrides?.[sid] ?? s.price))}` : sid}
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
                      return new Intl.NumberFormat('ar-IQ', { style: "currency", currency: selectedAppt.currency || "IQD" }).format(total);
                    } catch {
                      return `${selectedAppt.currency || "IQD"} ${new Intl.NumberFormat('ar-IQ').format(total)}`;
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
      )}
      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[1000]">
          <div className="fixed inset-0 bg-black/50" onClick={() => (!deleteLoading ? setDeleteTarget(null) : null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-diva-deep">تأكيد الحذف</div>
                <button className="btn btn-outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>إغلاق</button>
              </div>
              <div className="space-y-3">
                <p>هل أنت متأكدة من حذف سجل الزبونة التالية؟ لا يمكن التراجع عن هذا الإجراء.</p>
                <div className="p-3 rounded-xl bg-pink-50 text-pink-900">
                  <div className="font-medium">{deleteTarget.buyer || '-'}</div>
                  <div className="text-xs text-pink-800" suppressHydrationWarning>{new Intl.DateTimeFormat('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(deleteTarget.when))}</div>
                </div>
                {actionError && <div className="text-sm text-red-600">{actionError}</div>}
                <div className="flex items-center justify-end gap-3">
                  <button className="btn btn-outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>إلغاء</button>
                  <button className="btn btn-danger" onClick={confirmDelete} disabled={deleteLoading}>
                    {deleteLoading ? 'جارٍ الحذف...' : 'حذف نهائي'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

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
        {printingAll && (
          <div>
            {items.map((ap) => (
              <div key={ap._id} className="mb-6">
                <Receipt data={buildReceiptData(ap)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
