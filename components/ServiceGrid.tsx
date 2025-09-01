"use client";
import { Service } from "./types";

type Props = {
  services: Service[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export default function ServiceGrid({ services, selectedIds, onToggle }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {services.map((s) => {
        const active = selectedIds.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            className={`card p-4 text-left transition border-2 ${active ? "border-diva-deep" : "border-transparent hover:border-pink-300"}`}
            onClick={() => onToggle(s.id)}
          >
            <div className="text-sm text-pink-500">الخدمة</div>
            <div className="font-semibold mt-1">{s.name}</div>
            <div className="text-sm mt-2 text-gray-600">IQD {s.price.toLocaleString()}</div>
          </button>
        );
      })}
    </div>
  );
}
