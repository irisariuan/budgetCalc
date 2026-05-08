/** Returns true if the date string includes a time part (contains "T"). */
export function hasTime(dateStr: string): boolean {
	return dateStr.includes("T");
}

/** Format a date string ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm") in short form.
 *  If time is present, include it (e.g. "Jan 15, 3:45 PM").
 *  Otherwise, just the date (e.g. "Jan 15"). */
export function formatDateShort(dateStr: string): string {
	if (hasTime(dateStr)) {
		// Parse as local time (no Z).
		const d = new Date(dateStr);
		return d.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	}
	return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

/** Long form: weekday + full date, plus time if present. */
export function formatDateLong(dateStr: string): string {
	if (hasTime(dateStr)) {
		const d = new Date(dateStr);
		return d.toLocaleString("en-US", {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	}
	return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}
