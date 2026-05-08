import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	ReferenceLine,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import {
	generateBalanceChartData,
	calculateCurrentBalances,
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
import AdjustUserBalance from "./AdjustUserBalance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────
function formatCurrency(value: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserBalanceChart() {
	const { state, actions } = useStore();
	const currency = state.room?.currency ?? "USD";
	const [granularity, setGranularity] = useState<Granularity>("day");
	const [selectedDate, setSelectedDate] = useState<string>(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [range, setRange] = useState<{ from?: string; to?: string }>({});

	// Build chart config dynamically from members so legend labels + colors are correct
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
			generateBalanceChartData(
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
			calculateCurrentBalances(
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

			const today = new Date().toISOString().split("T")[0];
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

	// ── Empty state ───────────────────────────────────────────────────────────

	if (!hasData || state.members.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
				<TrendingUp className="h-10 w-10 opacity-40" />
				<p className="font-medium">No expense data yet</p>
				<p className="text-sm opacity-60">
					Add personal expenses to track member balances
				</p>
			</div>
		);
	}

	// ── Chart ─────────────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col gap-4">
			{/* Granularity toggle */}
			<GranularityControls
				granularity={granularity}
				onGranularityChange={setGranularity}
				selectedDate={selectedDate}
				onSelectedDateChange={setSelectedDate}
				range={range}
				onRangeChange={setRange}
			/>

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

					{/* Legend at the bottom */}
					<ChartLegend content={<ChartLegendContent />} />

					{/* One Area per member, colored with their assigned color */}
					{state.members.map((member) => (
						<Area
							key={member.id}
							type="monotone"
							dataKey={member.id}
							name={member.name}
							stroke={member.color}
							strokeWidth={2}
							fill={member.color}
							fillOpacity={0.15}
							dot={false}
						/>
					))}
				</AreaChart>
			</ChartContainer>

			{/* Current balance summary */}
			<div className="flex flex-wrap gap-2 px-1">
				{state.members.map((member) => {
					const balance = currentBalances[member.id] ?? 0;
					const isOwed = balance >= 0;
					return (
						<Badge
							key={member.id}
							variant="outline"
							className="gap-1.5 py-1 font-medium"
							style={{
								borderColor: `${member.color}55`,
								backgroundColor: `${member.color}18`,
								color: member.color,
							}}
						>
							{/* Color dot */}
							<span
								className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
								style={{ backgroundColor: member.color }}
							/>
							{member.name}
							<span className="font-mono">
								{isOwed ? "+" : ""}
								{formatCurrency(balance, currency)}
							</span>
						</Badge>
					);
				})}
			</div>

			{/* Settle Up */}
			<Separator />
			<SettleUpPanel
				settlements={settlements}
				members={state.members}
				currency={currency}
				onMarkAsPaid={handleMarkAsPaid}
			/>
			<AdjustUserBalance />
		</div>
	);
}
