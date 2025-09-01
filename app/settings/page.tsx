"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Employee, Service } from "@/components/types";
import DashboardDrawer from "@/components/DashboardDrawer";

export default function SettingsPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    const original = document.body.style.overflow;
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = original || "";
    }
    return () => {
      document.body.style.overflow = original || "";
    };
  }, [drawerOpen]);

  // Toasts
  type Toast = { id: number; msg: string; type?: "success" | "error" | "info" };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (msg: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState<string>("");
  const [newEmployeeName, setNewEmployeeName] = useState("");

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState("");
  const [editingServicePrice, setEditingServicePrice] = useState<string>("");
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editingEmployeeName, setEditingEmployeeName] = useState("");

  // Delete confirmation modal state
  type PendingDelete =
    | { kind: "service"; id: string; name: string }
    | { kind: "employee"; id: string; name: string }
    | null;
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const requestDeleteService = (s: Service) => setPendingDelete({ kind: "service", id: s.id, name: s.name });
  const requestDeleteEmployee = (emp: Employee) => setPendingDelete({ kind: "employee", id: emp.id, name: emp.name });
  const cancelDelete = () => setPendingDelete(null);
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.kind === "service") {
        const res = await fetch(`/api/services/${pendingDelete.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setServices((prev) => prev.filter((s) => s.id !== pendingDelete.id));
      } else {
        const res = await fetch(`/api/employees/${pendingDelete.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setEmployees((prev) => prev.filter((e) => e.id !== pendingDelete.id));
      }
    } catch (e) {
      showToast("تعذر الحذف", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [sRes, eRes] = await Promise.all([
        fetch("/api/services", { cache: "no-store" }),
        fetch("/api/employees", { cache: "no-store" }),
      ]);
      if (!sRes.ok || !eRes.ok) throw new Error("HTTP " + sRes.status + " / " + eRes.status);
      const [s, e] = await Promise.all([sRes.json(), eRes.json()]);
      setServices(s);
      setEmployees(e);
    } catch (e: any) {
      setError(e?.message || "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Handle Add to Home Screen prompt availability
  useEffect(() => {
    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true); // Only show if native prompt is available
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      showToast('تم تثبيت التطبيق على الجهاز', 'success');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as any);
    window.addEventListener('appinstalled', onInstalled as any);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as any);
      window.removeEventListener('appinstalled', onInstalled as any);
    };
  }, []);

  // Services handlers
  const addService = async () => {
    const priceNum = Number(newServicePrice.replace(/[^0-9.]/g, ""));
    if (!newServiceName || !Number.isFinite(priceNum)) return;
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newServiceName, price: priceNum }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created: Service = await res.json();
      setServices((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewServiceName("");
      setNewServicePrice("");
    } catch (e) {
      showToast("تعذر إضافة الخدمة", "error");
    }
  };

  const startEditService = (s: Service) => {
    setEditingServiceId(s.id);
    setEditingServiceName(s.name);
    setEditingServicePrice(String(s.price));
  };

  const saveService = async () => {
    if (!editingServiceId) return;
    const priceNum = Number(editingServicePrice.replace(/[^0-9.]/g, ""));
    const patch: any = {};
    if (editingServiceName.trim()) patch.name = editingServiceName.trim();
    if (Number.isFinite(priceNum)) patch.price = priceNum;
    if (Object.keys(patch).length === 0) return;
    try {
      const res = await fetch(`/api/services/${editingServiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: Service = await res.json();
      setServices((prev) => prev.map((it) => (it.id === updated.id ? updated : it)).sort((a, b) => a.name.localeCompare(b.name)));
      cancelServiceEdit();
    } catch (e) {
      showToast("تعذر حفظ التعديلات", "error");
    }
  };

  const deleteService = async (_id: string) => {
    // Kept for backward compatibility, but no direct confirm; use modal instead via requestDeleteService
  };

  const cancelServiceEdit = () => {
    setEditingServiceId(null);
    setEditingServiceName("");
    setEditingServicePrice("");
  };

  // Employees handlers
  const addEmployee = async () => {
    if (!newEmployeeName.trim()) return;
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newEmployeeName.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created: Employee = await res.json();
      setEmployees((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewEmployeeName("");
    } catch (e) {
      showToast("تعذر إضافة الموظفة", "error");
    }
  };

  const startEditEmployee = (e: Employee) => {
    setEditingEmployeeId(e.id);
    setEditingEmployeeName(e.name);
  };

  const saveEmployee = async () => {
    if (!editingEmployeeId || !editingEmployeeName.trim()) return;
    try {
      const res = await fetch(`/api/employees/${editingEmployeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingEmployeeName.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let updated: Employee | null = null;
      try {
        updated = await res.json();
      } catch {
        // Some environments may return 204 No Content or an empty body.
        updated = { id: editingEmployeeId, name: editingEmployeeName.trim() } as Employee;
      }
      if (updated) {
        setEmployees((prev) => prev.map((it) => (it.id === updated!.id ? updated! : it)).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        // Fallback to reload if we couldn't construct the updated item
        await loadAll();
      }
      cancelEmployeeEdit();
    } catch (e) {
      showToast("تعذر حفظ التعديلات", "error");
    }
  };

  const deleteEmployee = async (_id: string) => {
    // Kept for backward compatibility, but no direct confirm; use modal instead via requestDeleteEmployee
  };

  const cancelEmployeeEdit = () => {
    setEditingEmployeeId(null);
    setEditingEmployeeName("");
  };

  const onLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-diva-pink/20 grid place-items-center">
            <span className="text-diva-deep font-bold">⚙️</span>
          </div>
          <div>
            <div className="text-xl font-extrabold text-diva-deep">الإعدادات</div>
            <div className="text-sm text-pink-600">إدارة الخدمات والموظفات</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDrawerOpen(true)} className="btn btn-outline">لوحة التحكم</button>
          <button onClick={onLogout} className="btn btn-outline">تسجيل الخروج</button>
          {canInstall && (
            <button
              onClick={async () => {
                try {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                    await deferredPrompt.userChoice.catch(() => ({}));
                    setDeferredPrompt(null);
                    setCanInstall(false);
                  }
                } catch {
                  showToast('تعذر بدء التثبيت', 'error');
                }
              }}
              className="btn btn-primary"
              title="تثبيت التطبيق"
            >
              تثبيت التطبيق
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Services */}
          <section className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-diva-deep">الخدمات</h2>
              <button onClick={loadAll} className="text-xs text-pink-700 hover:underline">تحديث</button>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <input className="col-span-6 border rounded-xl px-3 py-2" placeholder="اسم الخدمة" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} />
              <input className="col-span-4 border rounded-xl px-3 py-2" placeholder="السعر" inputMode="decimal" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} />
              <button onClick={addService} className="col-span-2 btn btn-primary">إضافة</button>
            </div>
            <ul className="divide-y divide-pink-50">
              {services.map((s) => (
                <li key={s.id} className="py-3 flex items-center gap-3">
                  {editingServiceId === s.id ? (
                    <>
                      <input className="flex-1 border rounded-xl px-3 py-2" value={editingServiceName} onChange={(e) => setEditingServiceName(e.target.value)} />
                      <input className="w-32 border rounded-xl px-3 py-2" inputMode="decimal" value={editingServicePrice} onChange={(e) => setEditingServicePrice(e.target.value)} />
                      <button onClick={saveService} className="btn btn-primary">حفظ</button>
                      <button onClick={cancelServiceEdit} className="btn btn-outline">إلغاء</button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-gray-500" suppressHydrationWarning>
                          IQD {new Intl.NumberFormat('ar-IQ').format(s.price)}
                        </div>
                      </div>
                      <button onClick={() => startEditService(s)} className="btn btn-outline">تعديل</button>
                      <button onClick={() => requestDeleteService(s)} className="btn btn-outline">حذف</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Employees */}
          <section className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-diva-deep">الموظفات</h2>
              <button onClick={loadAll} className="text-xs text-pink-700 hover:underline">تحديث</button>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <input className="col-span-10 border rounded-xl px-3 py-2" placeholder="اسم الموظفة" value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} />
              <button onClick={addEmployee} className="col-span-2 btn btn-primary">إضافة</button>
            </div>
            <ul className="divide-y divide-pink-50">
              {employees.map((emp) => (
                <li key={emp.id} className="py-3 flex items-center gap-3">
                  {editingEmployeeId === emp.id ? (
                    <>
                      <input className="flex-1 border rounded-xl px-3 py-2" value={editingEmployeeName} onChange={(e) => setEditingEmployeeName(e.target.value)} />
                      <button onClick={saveEmployee} className="btn btn-primary">حفظ</button>
                      <button onClick={cancelEmployeeEdit} className="btn btn-outline">إلغاء</button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium">{emp.name}</div>
                      </div>
                      <button onClick={() => startEditEmployee(emp)} className="btn btn-outline">تعديل</button>
                      <button onClick={() => requestDeleteEmployee(emp)} className="btn btn-outline">حذف</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              `px-4 py-2 rounded-xl border backdrop-blur bg-white/90 ` +
              (t.type === "error" ? "border-red-300 text-red-700" : t.type === "success" ? "border-green-300 text-green-700" : "border-pink-200 text-pink-700")
            }
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={cancelDelete} />
          <div className="relative z-10 card p-5 w-full max-w-sm space-y-4">
            <div className="text-diva-deep font-semibold text-lg">تأكيد الحذف</div>
            <div className="text-sm text-gray-700">
              {pendingDelete.kind === "service" ? "هل تريد حذف الخدمة" : "هل تريد حذف الموظفة"}
              {" "}
              <span className="font-medium">{pendingDelete.name}</span>؟
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={cancelDelete} className="btn btn-outline">إلغاء</button>
              <button onClick={confirmDelete} className="btn btn-primary">حذف</button>
            </div>
          </div>
        </div>
      )}
      <DashboardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  );
}
