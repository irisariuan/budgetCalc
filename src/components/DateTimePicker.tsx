// ─── DateTimePicker ───────────────────────────────────────────────────────────
// Calendar (month/year dropdowns) + iOS-style time drum-roll, all in one.
// Designed to be placed inside a PopoverContent — it has no popover of its own.
//
// value  : "YYYY-MM-DDTHH:mm"  (local time, 24h, no seconds, no tz)
// onChange: called with the same format whenever date or time changes

import { format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { ScrollerColumn } from "@/components/TimeScroller";
import { Separator } from "@/components/ui/separator";

// ── item lists ────────────────────────────────────────────────────────────────

const HOURS   = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PERIODS: ("AM" | "PM")[] = ["AM", "PM"];

// ── helpers ───────────────────────────────────────────────────────────────────

/** Normalise any "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" string to "YYYY-MM-DDTHH:mm" */
export function normalizeTimestamp(raw: string): string {
  if (raw.includes("T")) return raw.slice(0, 16);
  return `${raw}T00:00`;
}

/** Return "YYYY-MM-DDTHH:mm" for right now (local time). */
export function nowTimestamp(): string {
  const n = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
}

function parseTs(value: string): {
  dateObj: Date;
  hour: string;
  minute: string;
  period: "AM" | "PM";
} {
  const ts   = normalizeTimestamp(value);
  const dateObj = parseISO(ts); // local-time parse
  const h24  = dateObj.getHours();
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const h12  = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  // Snap minute to nearest 5-min step
  const rawMin = dateObj.getMinutes();
  const snapped = Math.round(rawMin / 5) * 5;
  const minute  = String(snapped >= 60 ? 55 : snapped).padStart(2, "0");
  return { dateObj, hour: String(h12).padStart(2, "0"), minute, period };
}

function buildTs(
  dateObj: Date,
  hour: string,
  minute: string,
  period: "AM" | "PM",
): string {
  const h12 = parseInt(hour, 10);
  const h24 = period === "AM"
    ? (h12 === 12 ? 0 : h12)
    : (h12 === 12 ? 12 : h12 + 12);
  const dateStr = format(dateObj, "yyyy-MM-dd");
  return `${dateStr}T${String(h24).padStart(2, "0")}:${minute}`;
}

// ── component ─────────────────────────────────────────────────────────────────

export interface DateTimePickerProps {
  value: string;         // "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD"
  onChange: (value: string) => void;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const { dateObj, hour, minute, period } = parseTs(value);

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) return;
    onChange(buildTs(d, hour, minute, period));
  };

  const handleHour   = (h: string)          => onChange(buildTs(dateObj, h,    minute, period));
  const handleMinute = (m: string)          => onChange(buildTs(dateObj, hour, m,      period));
  const handlePeriod = (p: "AM" | "PM")    => onChange(buildTs(dateObj, hour, minute, p));

  return (
    <div className="flex flex-col gap-0">
      {/* ── Calendar ──────────────────────────────────────────────────────── */}
      <Calendar
        mode="single"
        selected={dateObj}
        onSelect={handleDateSelect}
        captionLayout="dropdown"
        startMonth={new Date(2020, 0)}
        endMonth={new Date(2035, 11)}
      />

      <Separator />

      {/* ── Time drum-roll ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1 px-3 py-2">
        {/* Label */}
        <span className="mr-2 text-xs text-muted-foreground shrink-0">Time</span>

        {/* Hours */}
        <ScrollerColumn
          items={HOURS}
          value={hour}
          onChange={handleHour}
          className="w-12"
        />

        <span className="text-muted-foreground font-semibold pb-0.5">:</span>

        {/* Minutes */}
        <ScrollerColumn
          items={MINUTES}
          value={minute}
          onChange={handleMinute}
          className="w-12"
        />

        {/* AM/PM */}
        <ScrollerColumn
          items={PERIODS}
          value={period}
          onChange={(v) => handlePeriod(v as "AM" | "PM")}
          className="w-14"
        />
      </div>
    </div>
  );
}
