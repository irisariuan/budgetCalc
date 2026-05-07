import { useId, useMemo } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	ReferenceLine,
} from "recharts";
import { Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { generateBudgetChartData } from "@/lib/chartUtils";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";

// ─── Static chart config ──────────────────────────────────────────────────────

const chartConfig = {
	added: { label: "Total Added", color: "#94a3b8" },
	remaining: { label: "Remaining", color: "#22c55e" },
} satisfies ChartConfig;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
	const d = new Date(`${dateStr}T00:00:00Z`);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

function formatCurrency(value: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BudgetOverviewChart() {
	const { state } = useStore();
	const currency = state.room?.currency ?? "USD";

	// Unique IDs so multiple chart instances on the same page don't clash
	const uid = useId().replace(/:/g, "");
	const fillAddedId = `fillAdded-${uid}`;
	const fillRemainingId = `fillRemaining-${uid}`;

	const data = useMemo(
		() => generateBudgetChartData(state.budgetAdditions, state.expenses),
		[state.budgetAdditions, state.expenses],
	);

	const hasData =
		state.budgetAdditions.length > 0 ||
		state.expenses.some((e) => e.source === "group");

	const lastPoint = data[data.length - 1];
	const totalRemaining = lastPoint?.remaining ?? 0;
	const isPositive = totalRemaining >= 0;

	// ── Compute the gradient stop at y = 0 ───────────────────────────────────
	// The chart y-axis goes from maxR (top) to minR (bottom).
	// Zero position from the top = maxR / (maxR - minR).
	// Math.max/min with 0 guarantees the anchors are always included.
	const remainingValues = data.map((d) => d.remaining);
	const maxR = Math.max(...remainingValues, 0);
	const minR = Math.min(...remainingValues, 0);
	const rRange = maxR - minR;
	const zeroStop =
		rRange > 0.001 ? `${((maxR / rRange) * 100).toFixed(1)}%` : "100%";

	// ── Empty state ───────────────────────────────────────────────────────────

	if (!hasData) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
				<Wallet className="h-10 w-10 opacity-40" />
				<p className="text-sm font-medium">No budget data yet</p>
				<p className="text-xs opacity-60">
					Add a budget or group expenses to see the overview
				</p>
			</div>
		);
	}

	// ── Chart ─────────────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col gap-4">
			{/* Summary header */}
			<div className="flex items-center justify-between">
				<span className="text-sm text-muted-foreground">
					Cumulative budget over time
				</span>
				<Badge
					variant="outline"
					className={
						isPositive
							? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400"
							: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400"
					}
				>
					{isPositive ? "Remaining" : "Over budget"}
					&nbsp;·&nbsp;
					{formatCurrency(Math.abs(totalRemaining), currency)}
				</Badge>
			</div>

			<ChartContainer config={chartConfig} className="min-h-55 w-full">
				<AreaChart
					accessibilityLayer
					data={data}
					margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
				>
					{/* ── Gradient definitions ─────────────────────────────── */}
					<defs>
						<linearGradient
							id={fillAddedId}
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
							<stop
								offset="5%"
								stopColor="#94a3b8"
								stopOpacity={0.4}
							/>
							<stop
								offset="95%"
								stopColor="#94a3b8"
								stopOpacity={0.05}
							/>
						</linearGradient>

						{/*
						 * Remaining gradient:
						 * - Green from top down to the y=0 crossing.
						 * - Red from the y=0 crossing to the bottom.
						 * When all values are positive, zeroStop ≈ 100% → all green.
						 * When all values are negative, zeroStop ≈ 0%  → all red.
						 */}
						<linearGradient
							id={fillRemainingId}
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
							<stop
								offset="0%"
								stopColor="#22c55e"
								stopOpacity={0.6}
							/>
							<stop
								offset={zeroStop}
								stopColor="#22c55e"
								stopOpacity={0.1}
							/>
							<stop
								offset={zeroStop}
								stopColor="#ef4444"
								stopOpacity={0.1}
							/>
							<stop
								offset="100%"
								stopColor="#ef4444"
								stopOpacity={0.65}
							/>
						</linearGradient>
					</defs>

					<CartesianGrid strokeDasharray="3 3" vertical={false} />

					<XAxis
						dataKey="date"
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						minTickGap={40}
						interval="preserveStartEnd"
						tickFormatter={formatDate}
					/>

					<YAxis
						tickLine={false}
						axisLine={false}
						tickMargin={4}
						width={72}
						tickFormatter={(v: number) =>
							formatCurrency(v, currency)
						}
					/>

					<ChartTooltip
						content={
							<ChartTooltipContent
								labelFormatter={(value) =>
									formatDate(String(value))
								}
								formatter={(value, name, item) => (
									<>
										<div
											className="h-2.5 w-2.5 shrink-0 rounded-sm"
											style={{
												backgroundColor:
													item.color ??
													(String(name) === "added"
														? "#94a3b8"
														: "#22c55e"),
											}}
										/>
										<div className="flex flex-1 items-center justify-between gap-6 leading-none">
											<span className="text-muted-foreground">
												{chartConfig[
													String(
														name,
													) as keyof typeof chartConfig
												]?.label ?? String(name)}
											</span>
											<span className="font-mono font-medium tabular-nums">
												{formatCurrency(
													Number(value),
													currency,
												)}
											</span>
										</div>
									</>
								)}
							/>
						}
					/>

					{/* Zero baseline */}
					<ReferenceLine
						y={0}
						stroke="#94a3b8"
						strokeDasharray="4 4"
						strokeWidth={1.5}
					/>

					{/* Added budget (gray, below) */}
					<Area
						type="monotone"
						dataKey="added"
						stroke="#94a3b8"
						strokeWidth={1.5}
						fill={`url(#${fillAddedId})`}
						dot={false}
					/>

					{/* Remaining budget (green/red, on top) */}
					<Area
						type="monotone"
						dataKey="remaining"
						stroke={isPositive ? "#22c55e" : "#ef4444"}
						strokeWidth={2}
						fill={`url(#${fillRemainingId})`}
						dot={false}
					/>
				</AreaChart>
			</ChartContainer>
		</div>
	);
}
