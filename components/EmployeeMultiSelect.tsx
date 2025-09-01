"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { Employee } from "./types";

type Props = {
  employees: Employee[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  forceOpen?: boolean;
};

export default function EmployeeMultiSelect({ employees, selectedIds, onChange, forceOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (forceOpen) return; // do not auto-close when forced open inside modal
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const set = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, query]);

  const toggle = (id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange([...next]);
  };

  const selectAllFiltered = () => {
    const ids = new Set(selectedIds);
    filtered.forEach((e) => ids.add(e.id));
    onChange([...ids]);
  };

  const clearAll = () => onChange([]);

  const summary = selectedIds.length
    ? `${selectedIds.length} مختارة`
    : "اختيار الموظفات";

  const panelOpen = forceOpen || open;

  return (
    <div className="relative" ref={rootRef}>
      {!forceOpen && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between border rounded-xl px-3 py-2 hover:bg-pink-50"
          aria-haspopup="listbox"
          aria-expanded={panelOpen}
        >
          <span className="text-sm text-gray-700">{summary}</span>
          <svg className={`w-4 h-4 text-pink-600 transition ${panelOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.19l3.71-3.96a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {panelOpen && (
        <div className={`${forceOpen ? "relative w-full" : "absolute z-50 mt-2 w-full"} card p-3`}>
          <div className="flex gap-2 mb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحثي عن موظفة"
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
              autoFocus={!!forceOpen}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <div>
              <span className="font-medium">المختارة:</span> {selectedIds.length}
              <span className="mx-2">•</span>
              <span className="font-medium">المعروضة:</span> {filtered.length}/{employees.length}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={selectAllFiltered} className="px-2 py-1 rounded-lg border border-pink-200 hover:bg-pink-50">تحديد الكل</button>
              <button type="button" onClick={clearAll} className="px-2 py-1 rounded-lg border border-pink-200 hover:bg-pink-50">مسح</button>
            </div>
          </div>
          <ul role="listbox" aria-multiselectable className={`${forceOpen ? "max-h-[60vh]" : "max-h-64"} overflow-y-auto divide-y divide-pink-50 border rounded-xl`}>
            {filtered.map((e) => {
              const active = set.has(e.id);
              return (
                <li key={e.id}>
                  <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-pink-50">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggle(e.id)}
                      className="accent-pink-600"
                    />
                    <span className="text-sm">{e.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
