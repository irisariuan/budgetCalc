import type {
	BalanceAdjustment,
	BudgetAdjustment,
	BudgetDataPoint,
	BalanceDataPoint,
	Expense,
	Member,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the ISO date string for the day before a given YYYY-MM-DD string. */
function dayBefore(dateStr: string): string {
	const d = new Date(`${dateStr}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - 1);
	return d.toISOString().split("T")[0];
}

/** Returns today as a YYYY-MM-DD string (UTC). */
function todayStr(): string {
	return new Date().toISOString().split("T")[0];
}

// ─── Granularity ──────────────────────────────────────────────────────────────

export type Granularity = "day" | "week" | "month" | "daily" | "custom";

/** Extract the YYYY-MM-DD part from either "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm". */
export function toDateOnly(d: string): string {
	return d.slice(0, 10);
}

/**
 * Extract the full minute-resolution timestamp "YYYY-MM-DDTHH:mm" from either
 * "YYYY-MM-DD" (treated as T00:00) or a longer "YYYY-MM-DDTHH:mm[:ss]" string.
 */
export function toMinuteTs(d: string): string {
	if (d.includes("T")) return d.slice(0, 16);
	return `${d}T00:00`;
}

/**
 * Return the Monday (start of ISO week) for a YYYY-MM-DD string as YYYY-MM-DD.
 */
export function weekBucket(dateStr: string): string {
	const d = new Date(`${toDateOnly(dateStr)}T00:00:00Z`);
	const day = d.getUTCDay(); // 0 = Sunday
	const diff = (day + 6) % 7; // days to subtract to reach Monday
	d.setUTCDate(d.getUTCDate() - diff);
	return d.toISOString().slice(0, 10);
}

/** Return the first of the month for a YYYY-MM-DD string as YYYY-MM-DD. */
export function monthBucket(dateStr: string): string {
	return `${toDateOnly(dateStr).slice(0, 7)}-01`;
}

/**
 * Map a date string to its bucket key for the given granularity.
 * "day"    → "YYYY-MM-DD"
 * "week"   → Monday of that week as "YYYY-MM-DD"
 * "month"  → "YYYY-MM-01"
 * "daily"  → "YYYY-MM-DDTHH:mm" (per-transaction timestamp)
 * "custom" → "YYYY-MM-DD" (same as "day")
 */
export function getBucketKey(dateStr: string, gran: Granularity): string {
	if (gran === "daily") return toMinuteTs(dateStr);
	const d = toDateOnly(dateStr);
	if (gran === "week") return weekBucket(d);
	if (gran === "month") return monthBucket(d);
	return d;
}

/**
 * Human-readable XAxis label for a bucket key.
 * "day"   → "Jan 15"
 * "week"  → "Jan 15 – 21"   (Mon → Sun of that week)
 * "month" → "Jan 2024"
 */
export function formatBucketLabel(key: string, gran: Granularity): string {
	if (gran === "daily") {
		// Key is "YYYY-MM-DDTHH:mm" – show just the time part.
		const ts = toMinuteTs(key);
		return ts.slice(11, 16);
	}
	const d = new Date(`${toDateOnly(key)}T00:00:00Z`);
	if (gran === "month") {
		return d.toLocaleDateString("en-US", {
			month: "short",
			year: "numeric",
			timeZone: "UTC",
		});
	}
	if (gran === "week") {
		const end = new Date(d);
		end.setUTCDate(end.getUTCDate() + 6);
		const startStr = d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			timeZone: "UTC",
		});
		const endStr = end.toLocaleDateString("en-US", {
			day: "numeric",
			timeZone: "UTC",
		});
		return `${startStr} – ${endStr}`;
	}
	// day
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

// ─── Budget chart ─────────────────────────────────────────────────────────────

/**
 * Generates time-series data for the budget overview chart.
 *
 * - Shows cumulative added budget vs cumulative group spending.
 * - One data point per calendar day on which at least one event (budget
 *   addition or group expense) occurred.
 * - Always starts with a zero data point so the chart anchors at the origin.
 */
export function generateBudgetChartData(
	budgetAdditions: BudgetAdjustment[],
	expenses: Expense[],
	granularity: Granularity = "day",
	options?: {
		selectedDate?: string; // used when granularity === "daily" (YYYY-MM-DD)
		rangeStart?: string; // used when granularity === "custom" (YYYY-MM-DD)
		rangeEnd?: string; // used when granularity === "custom" (YYYY-MM-DD)
	},
): BudgetDataPoint[] {
	const selectedDate = options?.selectedDate ?? todayStr();
	const rangeStart = options?.rangeStart;
	const rangeEnd = options?.rangeEnd;

	// ── Event-level filtering (for "daily" / "custom") ──────────────────────
	const keepAddition = (a: BudgetAdjustment): boolean => {
		if (granularity === "daily") return toDateOnly(a.date) === selectedDate;
		if (granularity === "custom" && rangeStart && rangeEnd) {
			const d = toDateOnly(a.date);
			return d >= rangeStart && d <= rangeEnd;
		}
		return true;
	};
	const keepExpense = (e: Expense): boolean => {
		if (granularity === "daily") return toDateOnly(e.date) === selectedDate;
		if (granularity === "custom" && rangeStart && rangeEnd) {
			const d = toDateOnly(e.date);
			return d >= rangeStart && d <= rangeEnd;
		}
		return true;
	};

	const isDaily = granularity === "daily";

	// Accumulate deltas keyed per event-date (day for everything except
	// "daily", which keys per full timestamp).
	const dailyMap = new Map<string, { added: number; spent: number }>();
	const keyOf = (rawDate: string): string =>
		isDaily ? toMinuteTs(rawDate) : toDateOnly(rawDate);

	for (const addition of budgetAdditions) {
		if (!keepAddition(addition)) continue;
		const k = keyOf(addition.date);
		const entry = dailyMap.get(k) ?? { added: 0, spent: 0 };
		entry.added += addition.amount;
		dailyMap.set(k, entry);
	}

	for (const expense of expenses) {
		if (expense.source !== "group") continue;
		if (!keepExpense(expense)) continue;
		const k = keyOf(expense.date);
		const entry = dailyMap.get(k) ?? { added: 0, spent: 0 };
		entry.spent += expense.amount;
		dailyMap.set(k, entry);
	}

	const sortedDates = Array.from(dailyMap.keys()).sort();

	if (sortedDates.length === 0) {
		const anchor =
			granularity === "daily"
				? `${selectedDate}T00:00`
				: granularity === "custom" && rangeStart
					? rangeStart
					: todayStr();
		return [{ date: anchor, added: 0, spent: 0, remaining: 0 }];
	}

	// ── Bucket aggregation ──────────────────────────────────────────────────
	const bucketMap = new Map<string, { added: number; spent: number }>();
	for (const date of sortedDates) {
		const key = getBucketKey(date, granularity);
		const existing = bucketMap.get(key) ?? { added: 0, spent: 0 };
		const daily = dailyMap.get(date)!;
		existing.added += daily.added;
		existing.spent += daily.spent;
		bucketMap.set(key, existing);
	}

	const sortedBuckets = Array.from(bucketMap.keys()).sort();

	// Zero anchor
	const anchorDate =
		granularity === "daily"
			? `${selectedDate}T00:00`
			: granularity === "custom" && rangeStart
				? rangeStart
				: dayBefore(sortedBuckets[0]);

	const result: BudgetDataPoint[] = [
		{ date: anchorDate, added: 0, spent: 0, remaining: 0 },
	];

	let cumulativeAdded = 0;
	let cumulativeSpent = 0;

	for (const key of sortedBuckets) {
		const { added, spent } = bucketMap.get(key)!;
		cumulativeAdded += added;
		cumulativeSpent += spent;
		result.push({
			date: key,
			added: cumulativeAdded,
			spent: cumulativeSpent,
			remaining: cumulativeAdded - cumulativeSpent,
		});
	}

	return result;
}

// ─── Balance chart ────────────────────────────────────────────────────────────

/**
 * Generates time-series data for the member balance chart.
 *
 * Rules:
 * - Only **personal** expenses affect balances.
 * - `paidById` member's balance increases by the full expense amount (they
 *   are owed money by the group).
 * - Each member in `splitAmong` has their balance decreased by
 *   `amount / splitAmong.length` (they owe their share).
 * - Positive balance → member should receive money.
 * - Negative balance → member owes money.
 * - All members start at 0.
 * - Always starts with a zero data point.
 */
export function generateBalanceChartData(
	members: Member[],
	expenses: Expense[],
	adjustments: BalanceAdjustment[] = [],
	granularity: Granularity = "day",
	options?: {
		selectedDate?: string; // YYYY-MM-DD for "daily"
		rangeStart?: string; // YYYY-MM-DD for "custom"
		rangeEnd?: string; // YYYY-MM-DD for "custom"
	},
): BalanceDataPoint[] {
	const selectedDate = options?.selectedDate ?? todayStr();
	const rangeStart = options?.rangeStart;
	const rangeEnd = options?.rangeEnd;

	const isDaily = granularity === "daily";
	const isCustom = granularity === "custom";

	const inRange = (rawDate: string): boolean => {
		if (isDaily) return toDateOnly(rawDate) === selectedDate;
		if (isCustom && rangeStart && rangeEnd) {
			const d = toDateOnly(rawDate);
			return d >= rangeStart && d <= rangeEnd;
		}
		return true;
	};

	const personalExpenses = expenses
		.filter((e) => e.source === "personal")
		.filter((e) => inRange(e.date));
	const filteredAdjustments = adjustments.filter((a) => inRange(a.date));

	// Zero anchor – used when there are no events at all.
	const buildZeroPoint = (date: string): BalanceDataPoint => {
		const point: BalanceDataPoint = { date };
		for (const m of members) point[m.id] = 0;
		return point;
	};

	if (personalExpenses.length === 0 && filteredAdjustments.length === 0) {
		const emptyAnchor = isDaily
			? `${selectedDate}T00:00`
			: isCustom && rangeStart
				? rangeStart
				: todayStr();
		return [buildZeroPoint(emptyAnchor)];
	}

	const keyOf = (rawDate: string): string =>
		isDaily ? toMinuteTs(rawDate) : toDateOnly(rawDate);

	// Group personal expenses by per-event key.
	const dailyExpenseMap = new Map<string, Expense[]>();
	for (const expense of personalExpenses) {
		const k = keyOf(expense.date);
		const list = dailyExpenseMap.get(k) ?? [];
		list.push(expense);
		dailyExpenseMap.set(k, list);
	}

	// Group adjustments by per-event key.
	const dailyAdjMap = new Map<string, BalanceAdjustment[]>();
	for (const adj of filteredAdjustments) {
		const k = keyOf(adj.date);
		const list = dailyAdjMap.get(k) ?? [];
		list.push(adj);
		dailyAdjMap.set(k, list);
	}

	// Merge all event keys and sort
	const allDates = Array.from(
		new Set([...dailyExpenseMap.keys(), ...dailyAdjMap.keys()]),
	).sort();

	// ── Bucket aggregation ──────────────────────────────────────────────────
	// Group dates into their bucket, preserving day-level maps for processing
	const bucketDates = new Map<string, string[]>(); // bucketKey → list of event-keys
	for (const date of allDates) {
		const key = getBucketKey(date, granularity);
		const list = bucketDates.get(key) ?? [];
		list.push(date);
		bucketDates.set(key, list);
	}
	const sortedBuckets = Array.from(bucketDates.keys()).sort();

	const balances: Record<string, number> = {};
	for (const m of members) balances[m.id] = 0;

	const anchorDate = isDaily
		? `${selectedDate}T00:00`
		: isCustom && rangeStart
			? rangeStart
			: dayBefore(sortedBuckets[0]);

	const result: BalanceDataPoint[] = [buildZeroPoint(anchorDate)];

	for (const bucketKey of sortedBuckets) {
		const datesInBucket = bucketDates.get(bucketKey)!;

		for (const date of datesInBucket) {
			const dayExpenses = dailyExpenseMap.get(date) ?? [];
			for (const expense of dayExpenses) {
				if (expense.splitAmong.length === 0) continue;
				if (expense.paidById !== null && expense.paidById in balances) {
					balances[expense.paidById] += expense.amount;
				}
				const share = expense.amount / expense.splitAmong.length;
				for (const memberId of expense.splitAmong) {
					if (memberId in balances) balances[memberId] -= share;
				}
			}
			const dayAdj = dailyAdjMap.get(date) ?? [];
			for (const adjustment of dayAdj) {
				if (adjustment.memberId in balances) {
					balances[adjustment.memberId] += adjustment.amount;
				}
			}
		}

		const point: BalanceDataPoint = { date: bucketKey };
		for (const m of members) point[m.id] = balances[m.id];
		result.push(point);
	}

	return result;
}

// ─── Settlements ────────────────────────────────────────────────────────────────

export interface Settlement {
	fromId: string; // the member who owes money (negative balance)
	toId: string; // the member who should receive money (positive balance)
	amount: number;
}

/**
 * Calculates the minimum set of transactions needed to fully settle all debts.
 *
 * Uses a greedy algorithm:
 * 1. Split members into creditors (positive balance) and debtors (negative).
 * 2. Repeatedly match the largest debtor with the largest creditor.
 * 3. The transfer amount is min(creditor, debtor).
 *
 * This minimises the total number of transactions.
 */
export function calculateSettlements(
	members: Member[],
	expenses: Expense[],
	adjustments: BalanceAdjustment[] = [],
): Settlement[] {
	const balances = calculateCurrentBalances(members, expenses, adjustments);

	// Build mutable creditor / debtor lists (amounts always positive here)
	const creditors: { id: string; amount: number }[] = [];
	const debtors: { id: string; amount: number }[] = [];

	for (const [id, balance] of Object.entries(balances)) {
		const rounded = Math.round(balance * 100) / 100;
		if (rounded > 0.005) creditors.push({ id, amount: rounded });
		if (rounded < -0.005) debtors.push({ id, amount: -rounded });
	}

	// Sort descending so the largest amounts are matched first
	creditors.sort((a, b) => b.amount - a.amount);
	debtors.sort((a, b) => b.amount - a.amount);

	const settlements: Settlement[] = [];
	let ci = 0;
	let di = 0;

	while (ci < creditors.length && di < debtors.length) {
		const transfer = Math.min(creditors[ci].amount, debtors[di].amount);

		if (transfer > 0.005) {
			settlements.push({
				fromId: debtors[di].id,
				toId: creditors[ci].id,
				amount: Math.round(transfer * 100) / 100,
			});
		}

		creditors[ci].amount -= transfer;
		debtors[di].amount -= transfer;

		if (creditors[ci].amount < 0.005) ci++;
		if (debtors[di].amount < 0.005) di++;
	}

	return settlements;
}

// ─── Current balances ─────────────────────────────────────────────────────────

/**
 * Calculates the current (final) balance for each member.
 *
 * Equivalent to the last data point of {@link generateBalanceChartData} but
 * computed directly without allocating the full time-series array.
 *
 * Positive = member should receive money from others.
 * Negative = member owes money to others.
 */
export function calculateCurrentBalances(
	members: Member[],
	expenses: Expense[],
	adjustments: BalanceAdjustment[] = [],
): Record<string, number> {
	const balances: Record<string, number> = {};
	for (const m of members) balances[m.id] = 0;

	for (const expense of expenses) {
		if (expense.source !== "personal") continue;
		if (expense.splitAmong.length === 0) continue;

		if (expense.paidById !== null && expense.paidById in balances) {
			balances[expense.paidById] += expense.amount;
		}

		const share = expense.amount / expense.splitAmong.length;
		for (const memberId of expense.splitAmong) {
			if (memberId in balances) {
				balances[memberId] -= share;
			}
		}
	}

	for (const adj of adjustments) {
		if (adj.memberId in balances) {
			balances[adj.memberId] += adj.amount;
		}
	}

	return balances;
}

// ─── Real (cash-flow) balances ────────────────────────────────────────────────

/**
 * Negated view of {@link calculateCurrentBalances}.
 *
 * Sign convention (cash-flow perspective):
 *   Negative → member paid money out of pocket (is owed money back).
 *   Positive → member owes money (has received value but hasn't paid yet).
 *   Zero     → fully settled.
 *
 * After a settlement payment the payer's balance drops and the receiver's
 * balance rises toward zero, reflecting actual cash movement.
 */
export function calculateCurrentRealBalances(
	members: Member[],
	expenses: Expense[],
	adjustments: BalanceAdjustment[] = [],
): Record<string, number> {
	const optimistic = calculateCurrentBalances(members, expenses, adjustments);
	return Object.fromEntries(
		Object.entries(optimistic).map(([id, v]) => [id, -v]),
	);
}

/**
 * Negated view of {@link generateBalanceChartData}.
 *
 * Produces the same time-series shape but with all member balance values
 * negated, so the chart shows who has paid out of pocket over time.
 */
export function generateRealBalanceChartData(
	members: Member[],
	expenses: Expense[],
	adjustments: BalanceAdjustment[] = [],
	granularity: Granularity = "day",
	options?: {
		selectedDate?: string;
		rangeStart?: string;
		rangeEnd?: string;
	},
): BalanceDataPoint[] {
	const raw = generateBalanceChartData(
		members,
		expenses,
		adjustments,
		granularity,
		options,
	);
	return raw.map((point) => {
		const negated: BalanceDataPoint = { date: point.date };
		for (const m of members) {
			negated[m.id] = -((point[m.id] as number) ?? 0);
		}
		return negated;
	});
}
