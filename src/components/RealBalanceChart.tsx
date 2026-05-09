import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	ReferenceLine,
} from "recharts";
import { TrendingDown, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import {
	generateRealBalanceChartData,
	calculateCurrentRealBalances,
	calculateSettlements,
	type Settlement,
	type Granularity,
	formatBucketLabel,
} from "@/lib/chartUtils";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SettleUpPanel from "./SettleUpPanel";
import { GranularityControls } from "@/components/GranularityControls";
import { useMemo, useCallback, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Component ───────────────────────────────────────────────────────────────
function formatCurrency(value: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RealBalanceChart() {
	const { state, actions } = useStore();
	const currency = state.room?.currency ?? "USD";
	const [granularity, setGranularity] = useState<Granularity>("day");
	const [selectedDate, setSelectedDate] = useState<string>(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [range, setRange] = useState<{ from?: string; to?: string }>({});

	const chartConfig = useMemo<ChartConfig>(() => {
		const config: ChartConfig = {};
		for (const member of state.members) {
			config[member.id] = {
				label: member.name,
				color: member.color,
			};
		}
		return config;
	}, [state.members]);

	const data = useMemo(
		() =>
			generateRealBalanceChartData(
				state.members,
				state.expenses,
				state.balanceAdjustments,
				granularity,
				{
					selectedDate,
					rangeStart: range.from,
					rangeEnd: range.to,
				},
			),
		[
			state.members,
			state.expenses,
			state.balanceAdjustments,
			granularity,
			selectedDate,
			range.from,
			range.to,
		],
	);

	const currentBalances = useMemo(
		() =>
			calculateCurrentRealBalances(
				state.members,
				state.expenses,
				state.balanceAdjustments,
			),
		[state.members, state.expenses, state.balanceAdjustments],
	);

	const settlements = useMemo(
		() =>
			calculateSettlements(
				state.members,
				state.expenses,
				state.balanceAdjustments,
			),
		[state.members, state.expenses, state.balanceAdjustments],
	);

	const handleMarkAsPaid = useCallback(
		async (settlement: Settlement) => {
			const payer = state.members.find((m) => m.id === settlement.fromId);
			const receiver = state.members.find(
				(m) => m.id === settlement.toId,
			);
			if (!payer || !receiver) return;
			const today = new Date().toISOString();
			await actions.addExpense({
				description: `Settlement: ${payer.name} → ${receiver.name}`,
				amount: settlement.amount,
				date: today,
				source: "personal",
				paidById: settlement.fromId,
				splitAmong: [settlement.toId],
				receipts: [],
			});
		},
		[state.members, actions],
	);

	const hasData = state.expenses.some((e) => e.source === "personal");

	if (!hasData || state.members.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
				<TrendingDown className="h-10 w-10 opacity-40" />
				<p className="font-medium">No expense data yet</p>
				<p className="text-sm opacity-60">
					Add personal expenses to see cash flow
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{/* ── Legend / explanation ─────────────────────────────────────── */}
			<div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
				<Info className="size-3.5 shrink-0 mt-px text-muted-foreground" />
				<p className="text-sm text-muted-foreground leading-relaxed">
					<span className="font-medium text-foreground">
						Cash flow view:
					</span>{" "}
					shows actual money spent out of each member's pocket.{" "}
					<div>
						<span className="text-red-600 dark:text-red-400 font-medium">
							Negative
						</span>{" "}
						<span>= paid out of pocket (owed back)</span>
					</div>
					<div>
						<span className="text-amber-600 dark:text-amber-400 font-medium">
							Positive
						</span>{" "}
						<span>
							= owes payment. Settles to zero when everyone has
							paid.
						</span>
					</div>
				</p>
			</div>

			{/* Granularity toggle */}
			<GranularityControls
				granularity={granularity}
				onGranularityChange={setGranularity}
				selectedDate={selectedDate}
				onSelectedDateChange={setSelectedDate}
				range={range}
				onRangeChange={setRange}
			/>

			{/* ── Area chart ───────────────────────────────────────────────── */}
			<ChartContainer config={chartConfig} className="min-h-60 w-full">
				<AreaChart
					accessibilityLayer
					data={data}
					margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
				>
					<CartesianGrid strokeDasharray="3 3" vertical={false} />

					<XAxis
						dataKey="date"
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						minTickGap={40}
						interval="preserveStartEnd"
						tickFormatter={(v: string) =>
							formatBucketLabel(v, granularity)
						}
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
									formatBucketLabel(
										String(value),
										granularity,
									)
								}
								formatter={(value, name, item) => (
									<>
										<div
											className="h-2.5 w-2.5 shrink-0 rounded-full"
											style={{
												backgroundColor:
													item.color ?? "#94a3b8",
											}}
										/>
										<div className="flex flex-1 items-center justify-between gap-6 leading-none">
											<span className="text-muted-foreground">
												{chartConfig[String(name)]
													?.label ?? String(name)}
											</span>
											<span
												className={`font-mono font-medium tabular-nums ${
													Number(value) < 0
														? "text-red-600 dark:text-red-400"
														: Number(value) > 0
															? "text-amber-600 dark:text-amber-400"
															: ""
												}`}
											>
												{Number(value) > 0 ? "+" : ""}
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

					<ChartLegend content={<ChartLegendContent />} />

					{state.members.map((member) => (
						<Area
							key={member.id}
							type="monotone"
							dataKey={member.id}
							name={member.name}
							stroke={member.color}
							strokeWidth={2}
							fill={member.color}
							fillOpacity={0.12}
							dot={false}
						/>
					))}
				</AreaChart>
			</ChartContainer>

			{/* ── Current real-balance summary ──────────────────────────────── */}
			<div className="flex flex-wrap gap-2 px-1">
				{state.members.map((member) => {
					const real = currentBalances[member.id] ?? 0;
					const isOwed = real < -0.005; // paid more than fair share → owed back
					const isOwes = real > 0.005; // hasn't paid fair share yet

					const amountLabel = isOwed
						? `Owed back ${formatCurrency(Math.abs(real), currency)}`
						: isOwes
							? `Owes ${formatCurrency(real, currency)}`
							: "Settled";

					return (
						<Badge
							key={member.id}
							variant="outline"
							className={`gap-1.5 py-1 font-medium ${
								isOwes
									? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400"
									: isOwed
										? ""
										: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400"
							}`}
							style={
								isOwed
									? {
											borderColor: `${member.color}55`,
											backgroundColor: `${member.color}18`,
											color: member.color,
										}
									: undefined
							}
						>
							<span
								className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
								style={{ backgroundColor: member.color }}
							/>
							<span
								className="font-medium"
								style={{ color: member.color }}
							>
								{member.name}
							</span>
							<span className="font-mono text-xs opacity-80">
								{amountLabel}
							</span>
						</Badge>
					);
				})}
			</div>

			<Separator />

			{/* ── Settle up ─────────────────────────────────────────────────── */}
			<SettleUpPanel
				settlements={settlements}
				members={state.members}
				currency={currency}
				onMarkAsPaid={handleMarkAsPaid}
			/>
		</div>
	);
}
