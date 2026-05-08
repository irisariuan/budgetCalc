// ─── GranularityControls ─────────────────────────────────────────────────────
// Shared toggle + popover date pickers used by the chart components.
//
// Granularities:
//   daily  → single-day view, per-transaction points. Shows a day picker.
//   day    → one bucket per day.
//   week   → one bucket per ISO week.
//   month  → one bucket per month.
//   custom → bucketed per day, constrained to a user-picked date range.

import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Granularity } from "@/lib/chartUtils";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRANULARITIES: Granularity[] = [
	"daily",
	"day",
	"week",
	"month",
	"custom",
];

const LABELS: Record<Granularity, string> = {
	daily: "Day",
	day: "Days",
	week: "Weeks",
	month: "Months",
	custom: "Custom",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → local Date (at midnight) for react-day-picker. */
function parseYMD(s: string): Date {
	const [y, m, d] = s.split("-").map(Number);
	return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Local Date → "YYYY-MM-DD". */
function formatYMD(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Short display label like "Jan 15" for a "YYYY-MM-DD" string. */
function displayDate(s: string): string {
	const d = parseYMD(s);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

/** Default: (today − 30d) → today, as "YYYY-MM-DD". */
function defaultRange(): { from: string; to: string } {
	const now = new Date();
	const start = new Date(now);
	start.setDate(start.getDate() - 30);
	return { from: formatYMD(start), to: formatYMD(now) };
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GranularityControlsProps {
	granularity: Granularity;
	onGranularityChange: (g: Granularity) => void;
	selectedDate: string; // YYYY-MM-DD
	onSelectedDateChange: (d: string) => void;
	range: { from?: string; to?: string };
	onRangeChange: (r: { from?: string; to?: string }) => void;
	className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GranularityControls({
	granularity,
	onGranularityChange,
	selectedDate,
	onSelectedDateChange,
	range,
	onRangeChange,
	className,
}: GranularityControlsProps) {
	const effectiveRange =
		range.from && range.to ? { from: range.from, to: range.to } : null;

	const handleGranularityClick = (g: Granularity) => {
		// When switching to "custom" with no range, seed with a sensible default
		if (g === "custom" && (!range.from || !range.to)) {
			onRangeChange(defaultRange());
		}
		onGranularityChange(g);
	};

	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-end gap-2",
				className,
			)}
		>
			{/* Granularity toggle */}
			<div className="flex items-center gap-1 rounded-lg border border-input p-0.5">
				{GRANULARITIES.map((g) => (
					<button
						key={g}
						type="button"
						onClick={() => handleGranularityClick(g)}
						className={cn(
							"rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
							granularity === g
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{LABELS[g]}
					</button>
				))}
			</div>

			{/* Daily: single date picker */}
			{granularity === "daily" && (
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className={cn(
								"inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-xs font-medium",
								"text-foreground hover:bg-accent hover:text-accent-foreground",
							)}
						>
							<CalendarIcon className="size-3.5" />
							{displayDate(selectedDate)}
						</button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="end">
						<Calendar
							mode="single"
							selected={parseYMD(selectedDate)}
							onSelect={(d) => {
								if (d) onSelectedDateChange(formatYMD(d));
							}}
							captionLayout="dropdown"
							startMonth={new Date(2020, 0)}
							endMonth={new Date(2035, 11)}
						/>
					</PopoverContent>
				</Popover>
			)}

			{/* Custom: range picker */}
			{granularity === "custom" && (
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className={cn(
								"inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-xs font-medium",
								"text-foreground hover:bg-accent hover:text-accent-foreground",
							)}
						>
							<CalendarIcon className="size-3.5" />
							{effectiveRange
								? `${displayDate(effectiveRange.from)} – ${displayDate(effectiveRange.to)}`
								: "Pick range"}
						</button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="end">
						<Calendar
							mode="range"
							selected={
								effectiveRange
									? {
											from: parseYMD(effectiveRange.from),
											to: parseYMD(effectiveRange.to),
										}
									: undefined
							}
							onSelect={(r: DateRange | undefined) => {
								onRangeChange({
									from: r?.from ? formatYMD(r.from) : undefined,
									to: r?.to ? formatYMD(r.to) : undefined,
								});
							}}
							captionLayout="dropdown"
							startMonth={new Date(2020, 0)}
							endMonth={new Date(2035, 11)}
							numberOfMonths={1}
						/>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}
