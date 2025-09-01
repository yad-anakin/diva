"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import ServiceGrid from "@/components/ServiceGrid";
import EmployeeMultiSelect from "@/components/EmployeeMultiSelect";
import Receipt, { type ReceiptData } from "@/components/Receipt";
import DashboardDrawer from "@/components/DashboardDrawer";
import type { Employee, Service } from "@/components/types";

export default function HomePage() {
  const [buyer, setBuyer] = useState("");
  const [currency, setCurrency] = useState("IQD");
  // Defer time initialization to client to avoid SSR/CSR mismatch
  const [when, setWhen] = useState<Date | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const printRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  type Appt = { buyer?: string; when: string; createdAt?: string; serviceIds?: string[]; currency?: string; overrides?: Record<string, number> };
  const [recentAppts, setRecentAppts] = useState<Appt[]>([]);

  useEffect(() => {
    // Initialize time on mount to avoid hydration mismatch
    if (!when) setWhen(new Date());
  }, [when]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [sRes, eRes] = await Promise.all([
          fetch("/api/services", { cache: "no-store" }),
          fetch("/api/employees", { cache: "no-store" }),
        ]);
        if (!sRes.ok || !eRes.ok) throw new Error("Failed to load data");
        const [s, e] = await Promise.all([sRes.json(), eRes.json()]);
        if (mounted) {
          setServices(s);
          setEmployees(e);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || "فشل التحميل");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Load recent history (last 24 hours)
  const loadRecent = async () => {
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      if (!res.ok) return;
      const items: Appt[] = await res.json();
      const now = Date.now();
      const last24 = items.filter((it) => {
        const t = +new Date(it.createdAt || it.when);
        return now - t <= 24 * 60 * 60 * 1000;
      });
      // sort by creation time desc (fallback to when)
      last24.sort((a, b) => +new Date(b.createdAt || b.when) - +new Date(a.createdAt || a.when));
      setRecentAppts(last24);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );

  const selectedEmployees = useMemo(
    () => employees.filter((e) => selectedEmployeeIds.includes(e.id)),
    [employees, selectedEmployeeIds]
  );

  const handlePriceChange = (id: string, val: string) => {
    const num = Number(val.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(num)) setOverrides((o) => ({ ...o, [id]: num }));
  };

  const total = selectedServices.reduce(
    (acc, s) => acc + (overrides[s.id] ?? s.price),
    0
  );

  const doPrint = () => {
    window.print();
  };

  const doSave = async () => {
    // Guard to prevent double submits
    if (saving || selectedServiceIds.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        buyer: buyer || "-",
        employeeIds: selectedEmployeeIds,
        serviceIds: selectedServiceIds,
        when: (when ?? new Date()).toISOString(),
        currency,
        overrides,
      };
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      // refresh recent list
      loadRecent();
      // Reset checkout form after successful save
      setBuyer("");
      setSelectedEmployeeIds([]);
      setSelectedServiceIds([]);
      setOverrides({});
      setCurrency("IQD");
      setWhen(new Date());
    } catch (e: any) {
      setSaveError(e?.message || "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const receiptData: ReceiptData = {
    buyer,
    currency,
    employees: selectedEmployees,
    services: selectedServices,
    overrides,
    when: (when ?? new Date()).toISOString(),
  };

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="no-print">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-diva-pink/20 grid place-items-center">
              <span className="text-diva-deep font-bold">د</span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-diva-deep">صالون ديفا</div>
              <div className="text-sm text-pink-600">صالون نسائي</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="btn btn-outline"
              title="Open dashboard"
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

        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 card p-6">
            <h2 className="text-lg font-semibold text-diva-deep mb-4">اختيار الخدمات</h2>
            {loading ? (
              <div className="text-sm text-gray-500">جاري التحميل...</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : (
              <ServiceGrid
                services={services}
                selectedIds={selectedServiceIds}
                onToggle={toggleService}
              />
            )}
          </section>

          <aside className="card p-6 space-y-5">
            <div>
              <label className="block text-sm text-gray-600 mb-1">اسم الزبونة</label>
              <input
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                placeholder="أدخلي اسم الزبونة"
                className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">تعيين الموظفات</label>
              <EmployeeMultiSelect
                employees={employees}
                selectedIds={selectedEmployeeIds}
                onChange={setSelectedEmployeeIds}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">العملة</label>
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="w-full border rounded-xl px-3 py-2"
                  placeholder="IQD"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">التاريخ والوقت</label>
                <input
                  type="datetime-local"
                  value={when
                    ? new Date(when.getTime() - when.getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)
                    : ""}
                  onChange={(e) => setWhen(new Date(e.target.value))}
                  className="w-full border rounded-xl px-3 py-2"
                />
                <div className="text-xs text-gray-500 mt-1" suppressHydrationWarning>
                  {when
                    ? new Intl.DateTimeFormat("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(when))
                    : ""}
                </div>
              </div>
            </div>

            {selectedServices.length > 0 && (
              <div className="border-t pt-4">
                <div className="font-semibold mb-2">الخدمات المختارة</div>
                <div className="space-y-2">
                  {selectedServices.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-gray-500" suppressHydrationWarning>
                          الافتراضي: IQD {new Intl.NumberFormat('ar-IQ').format(s.price)}
                        </div>
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
                <div className="flex justify-between mt-4 text-lg font-semibold" suppressHydrationWarning>
                  <span>المجموع</span>
                  <span>
                    {(() => {
                      try {
                        return new Intl.NumberFormat('ar-IQ', { style: "currency", currency }).format(total);
                      } catch {
                        return `${currency} ${new Intl.NumberFormat('ar-IQ').format(total)}`;
                      }
                    })()}
                  </span>
                </div>
                {saveError && (
                  <div className="text-xs text-red-600 mt-2">{saveError}</div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={doSave}
                disabled={saving || selectedServiceIds.length === 0}
                className="btn btn-primary w-full"
                title="حفظ الفاتورة"
              >
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button onClick={doPrint} className="btn btn-outline w-full">طباعة</button>
            </div>
          </aside>
        </div>
        {/* Recent appointments in last 24 hours */}
        <section className="card p-6 mt-6">
          <h2 className="text-lg font-semibold text-diva-deep mb-3">سجل آخر 24 ساعة</h2>
          {recentAppts.length === 0 ? (
            <div className="text-sm text-gray-500">لا توجد سجلات خلال 24 ساعة الماضية.</div>
          ) : (
            <ul className="divide-y">
              {recentAppts.map((it, idx) => {
                const currencyToUse = it.currency || "IQD";
                const total = (it.serviceIds || []).reduce((acc, sid) => {
                  const s = services.find((x) => x.id === sid);
                  const price = (it.overrides?.[sid] ?? s?.price) ?? 0;
                  return acc + price;
                }, 0);
                let totalFmt = `${currencyToUse} ${new Intl.NumberFormat('ar-IQ').format(total)}`;
                try { totalFmt = new Intl.NumberFormat('ar-IQ', { style: "currency", currency: currencyToUse }).format(total); } catch {}
                const timeStr = new Date(it.when).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });
                return (
                  <li key={`${it.when}-${idx}`} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-pink-50 text-diva-deep">👤</span>
                      <div>
                        <div className="font-medium">{it.buyer && it.buyer.trim() ? it.buyer : "-"}</div>
                        <div className="text-xs text-gray-500" suppressHydrationWarning>{timeStr}</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{totalFmt}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Hidden printable area rendered for printing */}
      <div ref={printRef}>
        <Receipt data={receiptData} />
      </div>

      {/* Dashboard Drawer for scheduling future appointments */}
      <DashboardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  );
}
