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
import { useRef, type Dispatch, type Ref, type SetStateAction } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { CalendarIcon, Clock, TimerReset, Undo2 } from "lucide-react";
import { toast } from "sonner";

// ── item lists ────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) =>
	String(i + 1).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
	String(i).padStart(2, "0"),
);
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
	const ts = normalizeTimestamp(value);
	const dateObj = parseISO(ts); // local-time parse
	const h24 = dateObj.getHours();
	const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
	const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
	const minute = dateObj.getMinutes().toString().padStart(2, "0")
	return { dateObj, hour: String(h12).padStart(2, "0"), minute, period };
}

function buildTs(
	dateObj: Date,
	hour: string,
	minute: string,
	period: "AM" | "PM",
): string {
	try {
		const h12 = parseInt(hour, 10);
		const h24 =
			period === "AM"
				? h12 === 12
					? 0
					: h12
				: h12 === 12
					? 12
					: h12 + 12;
		const dateStr = format(dateObj, "yyyy-MM-dd");
		return `${dateStr}T${String(h24).padStart(2, "0")}:${minute}`;
	} catch (e) {
		console.error("Error building timestamp:", e);
		toast.error("Invalid date or time");
		return nowTimestamp();
	}
}

// ── component ─────────────────────────────────────────────────────────────────

export interface DateTimePickerProps {
	value: string; // "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD"
	onChange: (value: string) => void;
	ref?: Ref<HTMLDivElement>;
}

export function DateTimePicker({ value, onChange, ref }: DateTimePickerProps) {
	const { dateObj, hour, minute, period } = parseTs(value);

	const handleChange = (v: string) => {
		undoStack.current.push(value);
		onChange(v);
	};

	const handleDateSelect = (d: Date | undefined) => {
		if (!d) return;
		handleChange(buildTs(d, hour, minute, period));
	};

	const handleHour = (h: string) =>
		handleChange(buildTs(dateObj, h, minute, period));
	const handleMinute = (m: string) =>
		handleChange(buildTs(dateObj, hour, m, period));
	const handlePeriod = (p: "AM" | "PM") =>
		handleChange(buildTs(dateObj, hour, minute, p));

	const now = new Date();
	const startMonth = new Date(now.getFullYear() - 3, now.getMonth(), 1);
	const endMonth = new Date(now.getFullYear() + 3, now.getMonth(), 1);
	const undoStack = useRef<string[]>([]);

	return (
		<div className="flex flex-col gap-0 items-center" ref={ref}>
			{/* ── Calendar ──────────────────────────────────────────────────────── */}
			<Calendar
				mode="single"
				selected={dateObj}
				onSelect={handleDateSelect}
				captionLayout="dropdown"
				startMonth={startMonth}
				endMonth={endMonth}
			/>

			<Separator />

			{/* ── Time drum-roll ─────────────────────────────────────────────────── */}
			<div className="flex items-center justify-center gap-1 px-3 py-2">
				{/* Label */}
				<div className="mr-2 shrink-0 flex flex-col items-center gap-1">
					<Button
						size="icon-sm"
						variant="outline"
						onClick={() => handleChange(nowTimestamp())}
					>
						<Clock />
					</Button>
					<Button
						size="icon-sm"
						variant="outline"
						disabled={undoStack.current.length === 0}
						onClick={() => {
							const val = undoStack.current.pop();
							if (!val) return;
							onChange(val);
						}}
					>
						<Undo2 />
					</Button>
					<Button
						size="icon-sm"
						variant="outline"
						disabled={undoStack.current.length === 0}
						onClick={() => {
							const val = undoStack.current.shift();
							if (!val) return;
							onChange(val);
							undoStack.current = [];
						}}
					>
						<TimerReset />
					</Button>
				</div>

				{/* Hours */}
				<ScrollerColumn
					items={HOURS}
					value={hour}
					onChange={handleHour}
					className="w-12"
				/>

				<span className="text-muted-foreground font-semibold pb-0.5">
					:
				</span>

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
export function DateTimePickerButton({
	date,
	setDate,
}: {
	date: string;
	setDate: Dispatch<SetStateAction<string>>;
}) {
	const formattedString = format(parseISO(date), "PPP, h:mm a");

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">
					<CalendarIcon className="mr-2 size-4 opacity-60" />
					{date ? formattedString : "Pick a date & time"}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0 relative h-fit" align="start">
				<DateTimePicker value={date} onChange={setDate} />
			</PopoverContent>
		</Popover>
	);
}
