"use client";
import { Employee, Service } from "./types";

export type ReceiptData = {
  buyer: string;
  employees: Employee[];
  services: Service[];
  currency: string;
  overrides: Record<string, number>; // serviceId -> custom price
  when: string; // ISO string
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('ar-IQ', { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${new Intl.NumberFormat('ar-IQ').format(amount)}`;
  }
}

export default function Receipt({ data }: { data: ReceiptData }) {
  const total = data.services.reduce((acc, s) => acc + (data.overrides[s.id] ?? s.price), 0);

  return (
    <div className="print-only max-w-md mx-auto">
      <div className="border rounded-2xl p-6">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-diva-deep">صالون ديفا</div>
          <div className="text-sm text-gray-600">صالون تجميل نسائي</div>
        </div>

        <div className="text-sm space-y-1 mb-4">
          <div><span className="font-medium">الزبونة:</span> {data.buyer || "-"}</div>
          <div>
            <span className="font-medium">التاريخ:</span>{" "}
            <span suppressHydrationWarning>{new Date(data.when).toLocaleString("ar-IQ", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}</span>
          </div>
          <div><span className="font-medium">الموظفات:</span> {data.employees.length ? data.employees.map(e => e.name).join(", ") : "-"}</div>
        </div>

        <div className="border-t pt-3 text-sm">
          {data.services.map(s => {
            const price = data.overrides[s.id] ?? s.price;
            return (
              <div key={s.id} className="flex justify-between py-1">
                <span>{s.name}</span>
                <span>{money(price, data.currency)}</span>
              </div>
            );
          })}
          <div className="flex justify-between mt-3 border-t pt-2 font-semibold">
            <span>المجموع</span>
            <span>{money(total, data.currency)}</span>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          شكراً لاختياركم ديفا. دمتم متألقات!
        </div>
      </div>
    </div>
  );
}
