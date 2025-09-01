"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  value: string; // ISO string
  onChange: (nextISO: string) => void;
  inline?: boolean;
  highlightedDates?: Set<string> | string[]; // dates to highlight as YYYY-MM-DD (local)
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}
function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ArabicDateTimePicker({ value, onChange, inline, highlightedDates }: Props) {
  const initial = useMemo(() => new Date(value || new Date().toISOString()), [value]);
  const [open, setOpen] = useState<boolean>(!!inline);
  const [view, setView] = useState<Date>(() => startOfMonth(initial));
  const [hour, setHour] = useState<number>(initial.getHours());
  const [minute, setMinute] = useState<number>(initial.getMinutes());
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (inline) return; // no outside-close for inline mode
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [inline]);

  // Weekday headers (Sun..Sat) localized
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat("ar-IQ", { weekday: "short" }), []);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat("ar-IQ", { month: "long", year: "numeric" }), []);
  const timePreviewFormatter = useMemo(
    () => new Intl.DateTimeFormat("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    []
  );

  const selectedDate = new Date(value);

  const dateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const highlightSet = useMemo(() => {
    if (!highlightedDates) return null;
    if (highlightedDates instanceof Set) return highlightedDates as Set<string>;
    return new Set(highlightedDates as string[]);
  }, [highlightedDates]);

  // Build days grid
  const firstDay = view.getDay(); // 0=Sun
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));

  const setDatePart = (d: Date) => {
    const chosen = new Date(d);
    chosen.setHours(hour, minute, 0, 0);
    // normalize to local then to ISO
    onChange(chosen.toISOString());
  };

  const setTimePart = (h: number, m: number) => {
    setHour(h);
    setMinute(m);
    const current = new Date(value);
    const updated = new Date(current.getFullYear(), current.getMonth(), current.getDate(), h, m, 0, 0);
    onChange(updated.toISOString());
  };

  return (
    <div className={inline ? "" : "relative"} ref={rootRef}>
      {!inline && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="w-full border rounded-xl px-3 py-2 text-right hover:bg-pink-50">
          {timePreviewFormatter.format(new Date(value))}
        </button>
      )}

      {open && (
        <div className={inline ? "" : "absolute z-50 mt-2 w-full card p-3"}>
          <div className="flex items-center justify-between mb-2">
            <button type="button" className="px-2 py-1 rounded-lg border border-pink-200 hover:bg-pink-50" onClick={() => setView(addMonths(view, -1))}>‹</button>
            <div className="font-medium">{monthFormatter.format(view)}</div>
            <button type="button" className="px-2 py-1 rounded-lg border border-pink-200 hover:bg-pink-50" onClick={() => setView(addMonths(view, 1))}>›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs text-gray-600 mb-1">
            {[0,1,2,3,4,5,6].map((dow) => {
              const date = new Date(2021, 7, dow + 1); // arbitrary week
              return <div key={dow} className="text-center py-1">{weekdayFormatter.format(date)}</div>;
            })}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, idx) => {
              if (!d) return <div key={idx} className="py-2"></div>;
              const isToday = sameDate(d, new Date());
              const isSelected = sameDate(d, selectedDate);
              const isHighlighted = !isSelected && !!highlightSet && highlightSet.has(dateKey(d));
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDatePart(d)}
                  className={`py-2 rounded-lg text-sm border ${isSelected
                    ? "bg-diva-deep text-white border-diva-deep"
                    : isHighlighted
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : isToday
                        ? "border-pink-200"
                        : "border-transparent hover:border-pink-200"}`}
                >
                  {new Intl.NumberFormat("ar-IQ").format(d.getDate())}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">الساعة</label>
              <select
                value={hour}
                onChange={(e) => setTimePart(parseInt(e.target.value, 10), minute)}
                className="w-full border rounded-xl px-2 py-2"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{new Intl.NumberFormat("ar-IQ").format(h)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">الدقائق</label>
              <select
                value={minute}
                onChange={(e) => setTimePart(hour, parseInt(e.target.value, 10))}
                className="w-full border rounded-xl px-2 py-2"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>{new Intl.NumberFormat("ar-IQ").format(m)}</option>
                ))}
              </select>
            </div>
          </div>

          {!inline && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-600">{timePreviewFormatter.format(new Date(value))}</div>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-primary">تم</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
