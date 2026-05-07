import { useMemo } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	ReferenceLine,
} from "recharts";
import { TrendingUp, ArrowRight, CheckCircle2, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import {
	generateBalanceChartData,
	calculateCurrentBalances,
	calculateSettlements,
	type Settlement,
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

// ─── Settle Up Panel ──────────────────────────────────────────────────────────

interface SettleUpPanelProps {
	settlements: Settlement[];
	members: { id: string; name: string; color: string }[];
	currency: string;
}

function MemberChip({
	id,
	members,
}: {
	id: string;
	members: { id: string; name: string; color: string }[];
}) {
	const member = members.find((m) => m.id === id);
	if (!member) return null;
	return (
		<span className="inline-flex items-center gap-1.5">
			<span
				className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
				style={{ backgroundColor: member.color }}
			/>
			<span className="font-medium">{member.name}</span>
		</span>
	);
}

function SettleUpPanel({ settlements, members, currency }: SettleUpPanelProps) {
	const fmt = (n: number) =>
		new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(n);

	return (
		<div className="flex flex-col gap-2">
			{/* Section header */}
			<div className="flex items-center gap-2">
				<Wallet className="h-3.5 w-3.5 text-muted-foreground" />
				<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Settle Up
				</span>
				<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
					{settlements.length === 0
						? "All clear"
						: `${settlements.length} transaction${settlements.length !== 1 ? "s" : ""}`}
				</Badge>
			</div>

			{settlements.length === 0 ? (
				// ── All settled ──────────────────────────────────────────────
				<div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/30">
					<CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
					<span className="text-sm text-emerald-700 dark:text-emerald-300">
						Everyone is settled up!
					</span>
				</div>
			) : (
				// ── Settlement rows ──────────────────────────────────────────
				<div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
					{settlements.map((s, i) => {
						const payer = members.find((m) => m.id === s.fromId);
						const receiver = members.find((m) => m.id === s.toId);
						if (!payer || !receiver) return null;
						return (
							<div
								key={i}
								className="flex items-center gap-3 px-4 py-3 text-sm"
							>
								{/* Payer */}
								<div
									className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
									style={{ backgroundColor: payer.color }}
								>
									{payer.name.charAt(0).toUpperCase()}
								</div>
								<div className="flex min-w-0 flex-1 items-center gap-1.5">
									<span className="truncate font-medium">
										{payer.name}
									</span>
									<span className="text-xs text-muted-foreground">
										pays
									</span>
									<span
										className="font-mono text-xs font-semibold"
										style={{ color: payer.color }}
									>
										{fmt(s.amount)}
									</span>
									<span className="text-xs text-muted-foreground">
										to
									</span>
								</div>
								<ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								{/* Receiver */}
								<div
									className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
									style={{ backgroundColor: receiver.color }}
								>
									{receiver.name.charAt(0).toUpperCase()}
								</div>
								<span className="truncate font-medium">
									{receiver.name}
								</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

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

export function UserBalanceChart() {
	const { state } = useStore();
	const currency = state.room?.currency ?? "USD";

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
		() => generateBalanceChartData(state.members, state.expenses),
		[state.members, state.expenses],
	);

	const currentBalances = useMemo(
		() => calculateCurrentBalances(state.members, state.expenses),
		[state.members, state.expenses],
	);

	const settlements = useMemo(
		() => calculateSettlements(state.members, state.expenses),
		[state.members, state.expenses],
	);

	const hasData = state.expenses.some((e) => e.source === "personal");

	// ── Empty state ───────────────────────────────────────────────────────────

	if (!hasData || state.members.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
				<TrendingUp className="h-10 w-10 opacity-40" />
				<p className="text-sm font-medium">No expense data yet</p>
				<p className="text-xs opacity-60">
					Add personal expenses to track member balances
				</p>
			</div>
		);
	}

	// ── Chart ─────────────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col gap-4">
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
							<span className="font-mono text-[11px]">
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
			/>
		</div>
	);
}
