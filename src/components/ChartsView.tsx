import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	Card,
	CardHeader,
	CardTitle,
	CardAction,
	CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { generateBudgetChartData } from "@/lib/chartUtils";
import { BudgetOverviewChart } from "./BudgetOverviewChart";
import { UserBalanceChart } from "./UserBalanceChart";
import { RealBalanceChart } from "./RealBalanceChart";

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChartsView() {
	const { state } = useStore();
	const currency = state.room?.currency ?? "USD";

	// Derive total remaining budget for the card header badge
	const budgetData = useMemo(
		() => generateBudgetChartData(state.budgetAdditions, state.expenses),
		[state.budgetAdditions, state.expenses],
	);
	const totalRemaining = budgetData[budgetData.length - 1]?.remaining ?? 0;
	const isPositive = totalRemaining >= 0;
	const hasAnyBudget = state.budgetAdditions.length > 0;

	return (
		<Card className="w-full shadow-sm">
			{/* ── Card header ──────────────────────────────────────────────── */}
			<CardHeader className="border-b">
				<CardTitle>Analytics</CardTitle>

				{hasAnyBudget && (
					<CardAction>
						<Badge
							variant="outline"
							className={
								isPositive
									? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400"
									: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400"
							}
						>
							{isPositive ? "Budget remaining" : "Over budget"}{" "}
							{formatCurrency(Math.abs(totalRemaining), currency)}
						</Badge>
					</CardAction>
				)}
			</CardHeader>

			{/* ── Tabbed content ───────────────────────────────────────────── */}
			<CardContent className="pt-4">
				<Tabs defaultValue="budget">
					<TabsList className="mb-4 w-fit" variant="line">
						<TabsTrigger value="budget">Group Budget</TabsTrigger>
						<TabsTrigger value="balances">
							Member Balances
						</TabsTrigger>
						<TabsTrigger value="real">Cash Flow</TabsTrigger>
					</TabsList>

					<TabsContent value="budget">
						<BudgetOverviewChart />
					</TabsContent>

					<TabsContent value="balances">
						<UserBalanceChart />
					</TabsContent>

					<TabsContent value="real">
						<RealBalanceChart />
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
