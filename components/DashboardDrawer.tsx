"use client";
import Link from "next/link";
import { createPortal } from "react-dom";
// Drawer now only provides navigation links

export default function DashboardDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeOnBg = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.bg === "1") onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50" data-bg="1" onClick={closeOnBg}></div>
      <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col z-10">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="text-lg font-semibold text-diva-deep">لوحة التحكم</div>
          <button onClick={onClose} className="btn btn-outline">إغلاق</button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto">
          <nav className="space-y-2">
            <Link href="/" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-pink-50 border border-pink-100">
              <span className="w-8 h-8 rounded-lg bg-diva-pink/20 grid place-items-center text-diva-deep">🏠</span>
              <div>
                <div className="font-medium">الصفحة الرئيسية</div>
                <div className="text-xs text-gray-600">العودة إلى الصفحة الرئيسية</div>
              </div>
            </Link>
            <Link href="/appointment" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-pink-50 border border-pink-100">
              <span className="w-8 h-8 rounded-lg bg-diva-pink/20 grid place-items-center text-diva-deep">📅</span>
              <div>
                <div className="font-medium">حجز موعد</div>
                <div className="text-xs text-gray-600">إنشاء وإدارة الحجوزات القادمة</div>
              </div>
            </Link>
            <Link href="/history" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-pink-50 border border-pink-100">
              <span className="w-8 h-8 rounded-lg bg-diva-pink/20 grid place-items-center text-diva-deep">📖</span>
              <div>
                <div className="font-medium">سجل الزبونات</div>
                <div className="text-xs text-gray-600">عرض كل الزبونات حسب التاريخ</div>
              </div>
            </Link>
            <Link href="/saved" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-pink-50 border border-pink-100">
              <span className="w-8 h-8 rounded-lg bg-diva-pink/20 grid place-items-center text-diva-deep">💾</span>
              <div>
                <div className="font-medium">المواعيد المحفوظة</div>
                <div className="text-xs text-gray-600">عرض جميع الحجوزات المحفوظة</div>
              </div>
            </Link>
            <Link href="/settings" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-pink-50 border border-pink-100">
              <span className="w-8 h-8 rounded-lg bg-diva-pink/20 grid place-items-center text-diva-deep">⚙️</span>
              <div>
                <div className="font-medium">الإعدادات</div>
                <div className="text-xs text-gray-600">تعديل الخدمات والموظفات</div>
              </div>
            </Link>
          </nav>
        </div>
      </div>
    </div>,
    document.body
  );
}
