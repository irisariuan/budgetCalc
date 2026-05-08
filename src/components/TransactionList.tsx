import {
	ArrowLeftRight,
	Receipt,
	ImageIcon,
	Users,
	User,
	ChevronRight,
	SlidersHorizontal,
	TrendingUp,
	TrendingDown,
	BadgeDollarSign,
	BanknoteArrowUp,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type {
	Expense,
	BalanceAdjustment,
	Member,
	BudgetAdjustment,
} from "@/lib/types";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpenseDetailPanel } from "@/components/ExpenseDetailPanel";
import { AdjustmentDetailPanel } from "@/components/AdjustmentDetailPanel";
import { PhotoCarouselLightbox } from "@/components/PhotoCarousel";
import { useEffect, useState, useMemo } from "react";
import { usePagination, Paginator } from "./Paginator";
import { formatDateShort } from "@/lib/dateFormat";
import { BudgetAdjustmentDetailPanel } from "./BudgetAdjustmentDetailPanel";

const PAGE_SIZE = 10;

// ─── Unified transaction item ─────────────────────────────────────────────────

type TransactionItem =
	| { kind: "expense"; data: Expense }
	| { kind: "adjustment"; data: BalanceAdjustment }
	| { kind: "budgetAddition"; data: Omit<BalanceAdjustment, "memberId"> };

function txDate(item: TransactionItem): string {
	return item.kind === "expense" ? item.data.date : item.data.date;
}
function txCreatedAt(item: TransactionItem): string {
	return item.kind === "expense" ? item.data.createdAt : item.data.createdAt;
}

// ─── Receipt thumbnail ────────────────────────────────────────────────────────

function ReceiptThumb({
	url,
	description,
}: {
	url: string;
	description: string;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setOpen(true);
				}}
				className="group relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted hover:border-primary/50 transition-colors"
				title="View receipt"
				aria-label="View receipt photo"
			>
				<img
					src={url}
					alt="Receipt"
					className="h-full w-full object-cover"
					onError={(e) => {
						(e.currentTarget as HTMLImageElement).style.display =
							"none";
						(
							e.currentTarget.nextSibling as HTMLElement
						).style.display = "flex";
					}}
				/>
				<span
					className="hidden h-full w-full items-center justify-center text-muted-foreground"
					style={{ display: "none" }}
				>
					<ImageIcon className="size-4" />
				</span>
				<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
			</button>
			<PhotoCarouselLightbox
				images={[{ url, alt: `Receipt: ${description}` }]}
				open={open}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}

// ─── Expense row ──────────────────────────────────────────────────────────────

interface ExpenseRowProps {
	expense: Expense;
	members: Member[];
	currency: string;
	onClick: () => void;
}

function ExpenseRow({ expense, members, currency, onClick }: ExpenseRowProps) {
	const paidBy = members.find((m) => m.id === expense.paidById);
	const splitNames = expense.splitAmong
		.map((id) => members.find((m) => m.id === id)?.name)
		.filter(Boolean);

	const fmt = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	const dateLabel = formatDateShort(expense.date);

	return (
		<button
			type="button"
			className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
			onClick={onClick}
			aria-label={`View details for ${expense.description}`}
		>
			{/* Receipt thumbnail or icon */}
			{expense.receiptUrl ? (
				expense.receiptUrl.map((url) => (
					<ReceiptThumb url={url} description={expense.description} />
				))
			) : (
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
					<Receipt className="size-4" />
				</div>
			)}

			{/* Main content */}
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex items-center gap-2 min-w-0">
					<span className="truncate text-sm font-medium leading-snug">
						{expense.description}
					</span>
					<Badge
						variant="outline"
						className={`shrink-0 text-xs px-1.5 py-0 h-4 ${
							expense.source === "group"
								? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400"
								: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/30 dark:text-violet-400"
						}`}
					>
						{expense.source === "group" ? (
							<>
								<Users className="size-2.5 mr-0.5" />
								Group
							</>
						) : (
							<>
								<User className="size-2.5 mr-0.5" />
								Personal
							</>
						)}
					</Badge>
				</div>
				<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
					<span>{dateLabel}</span>
					{expense.source === "personal" && paidBy && (
						<>
							<span className="flex items-center gap-1">
								<span
									className="inline-block h-1.5 w-1.5 rounded-full"
									style={{ backgroundColor: paidBy.color }}
								/>
								{paidBy.name} paid
							</span>
						</>
					)}
					{expense.source === "personal" && splitNames.length > 0 && (
						<>
							<span>
								split{" "}
								{splitNames.length > 3
									? `${splitNames.slice(0, 2).join(", ")} +${splitNames.length - 2}`
									: splitNames.join(", ")}
							</span>
						</>
					)}
				</div>
			</div>

			{/* Amount + chevron */}
			<div className="flex shrink-0 flex-col items-end gap-1">
				<span className="font-mono text-sm font-semibold tabular-nums">
					{fmt.format(expense.amount)}
				</span>
				<ChevronRight className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
			</div>
		</button>
	);
}

// ─── Adjustment row ───────────────────────────────────────────────────────────

interface AdjustmentRowProps {
	adjustment: BalanceAdjustment;
	members: Member[];
	currency: string;
	onClick: () => void;
}

function AdjustmentRow({
	adjustment,
	members,
	currency,
	onClick,
}: AdjustmentRowProps) {
	const member = members.find((m) => m.id === adjustment.memberId);
	const isCredit = adjustment.amount >= 0;

	const fmt = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	const dateLabel = formatDateShort(adjustment.date);

	return (
		<button
			type="button"
			className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
			onClick={onClick}
			aria-label={`View adjustment: ${adjustment.description}`}
		>
			{/* Member avatar */}
			<div
				className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
				style={{ backgroundColor: member?.color ?? "#94a3b8" }}
			>
				{member?.name.charAt(0).toUpperCase() ?? "?"}
			</div>

			{/* Main content */}
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex items-center gap-2 min-w-0">
					{adjustment.description && (
						<span className="truncate text-sm font-medium leading-snug">
							{adjustment.description}
						</span>
					)}
					<Badge
						variant="outline"
						className="shrink-0 text-xs px-1.5 py-0 h-4 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400"
					>
						<SlidersHorizontal className="size-2.5 mr-0.5" />
						Adjustment
					</Badge>
				</div>
				<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
					<span>{dateLabel}</span>
					{member && (
						<>
							<span className="flex items-center gap-1">
								<span
									className="inline-block h-1.5 w-1.5 rounded-full"
									style={{ backgroundColor: member.color }}
								/>
								{member.name}
							</span>
						</>
					)}
					<>
						<span
							className={
								isCredit
									? "text-emerald-600 dark:text-emerald-400"
									: "text-red-600 dark:text-red-400"
							}
						>
							{isCredit ? "credit" : "debit"}
						</span>
					</>
				</div>
			</div>

			{/* Signed amount + icon + chevron */}
			<div className="flex shrink-0 flex-col items-end gap-1">
				<div className="flex items-center gap-1">
					{isCredit ? (
						<TrendingUp className="size-3 text-emerald-500" />
					) : (
						<TrendingDown className="size-3 text-red-500" />
					)}
					<span
						className={`font-mono text-sm font-semibold tabular-nums ${
							isCredit
								? "text-emerald-600 dark:text-emerald-400"
								: "text-red-600 dark:text-red-400"
						}`}
					>
						{isCredit ? "+" : ""}
						{fmt.format(adjustment.amount)}
					</span>
				</div>
				<ChevronRight className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
			</div>
		</button>
	);
}

interface BudgetAdjustmentRowProps {
	adjustment: BudgetAdjustment;
	currency: string;
	onClick: () => void;
}

function BudgetAdjustmentRow({
	adjustment,
	currency,
	onClick,
}: BudgetAdjustmentRowProps) {
	const isCredit = adjustment.amount >= 0;

	const fmt = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	const dateLabel = formatDateShort(adjustment.date);

	return (
		<button
			type="button"
			className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
			onClick={onClick}
			aria-label={`View adjustment: ${adjustment.description}`}
		>
			{/* Member avatar */}
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white bg-amber-500">
				<BadgeDollarSign />
			</div>

			{/* Main content */}
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex items-center gap-2 min-w-0">
					{adjustment.description && (
						<span className="truncate text-sm font-medium leading-snug">
							{adjustment.description}
						</span>
					)}
					<Badge
						variant="outline"
						className="shrink-0 text-xs px-1.5 py-0 h-4 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400"
					>
						<BanknoteArrowUp className="size-2.5 mr-0.5" />
						Budget
					</Badge>
				</div>
				<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
					<span>{dateLabel}</span>
					<>
						<span
							className={
								isCredit
									? "text-emerald-600 dark:text-emerald-400"
									: "text-red-600 dark:text-red-400"
							}
						>
							{isCredit ? "credit" : "debit"}
						</span>
					</>
				</div>
			</div>

			{/* Signed amount + icon + chevron */}
			<div className="flex shrink-0 flex-col items-end gap-1">
				<div className="flex items-center gap-1">
					{isCredit ? (
						<TrendingUp className="size-3 text-emerald-500" />
					) : (
						<TrendingDown className="size-3 text-red-500" />
					)}
					<span
						className={`font-mono text-sm font-semibold tabular-nums ${
							isCredit
								? "text-emerald-600 dark:text-emerald-400"
								: "text-red-600 dark:text-red-400"
						}`}
					>
						{isCredit ? "+" : ""}
						{fmt.format(adjustment.amount)}
					</span>
				</div>
				<ChevronRight className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
			</div>
		</button>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TransactionList() {
	const { state } = useStore();
	const { expenses, members, balanceAdjustments, budgetAdditions } = state;
	const currency = state.room?.currency ?? "USD";

	// ── Detail panel state ────────────────────────────────────────────────────
	const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
		null,
	);
	const [expenseDetailOpen, setExpenseDetailOpen] = useState(false);

	const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<
		string | null
	>(null);
	const [adjustmentDetailOpen, setAdjustmentDetailOpen] = useState(false);
	const [selectedBudgetAdjustmentId, setSelectedBudgetAdjustmentId] =
		useState<string | null>(null);
	const [budgetAdjustmentDetailOpen, setBudgetAdjustmentDetailOpen] =
		useState(false);

	const handleExpenseClick = (expense: Expense) => {
		setSelectedExpenseId(expense.id);
		setExpenseDetailOpen(true);
	};
	const handleExpenseDetailOpenChange = (open: boolean) => {
		setExpenseDetailOpen(open);
		if (!open) setTimeout(() => setSelectedExpenseId(null), 300);
	};

	const handleAdjustmentClick = (adjustment: BalanceAdjustment) => {
		setSelectedAdjustmentId(adjustment.id);
		setAdjustmentDetailOpen(true);
	};
	const handleAdjustmentDetailOpenChange = (open: boolean) => {
		setAdjustmentDetailOpen(open);
		if (!open) setTimeout(() => setSelectedAdjustmentId(null), 300);
	};
	const handleBudgetAdjustmentClick = (adjustment: BudgetAdjustment) => {
		setSelectedBudgetAdjustmentId(adjustment.id);
		setBudgetAdjustmentDetailOpen(true);
	};
	const handleBudgetAdjustmentDetailOpenChange = (open: boolean) => {
		setBudgetAdjustmentDetailOpen(open);
		if (!open) setTimeout(() => setSelectedBudgetAdjustmentId(null), 300);
	};

	// ── Build unified sorted list ─────────────────────────────────────────────
	const sorted = useMemo<TransactionItem[]>(() => {
		const items: TransactionItem[] = [
			...expenses.map(
				(e): TransactionItem => ({ kind: "expense", data: e }),
			),
			...balanceAdjustments.map(
				(a): TransactionItem => ({
					kind: "adjustment",
					data: a,
				}),
			),
			...budgetAdditions.map(
				(a): TransactionItem => ({
					kind: "budgetAddition",
					data: {
						id: a.id,
						roomId: a.roomId,
						description: a.description,
						amount: a.amount,
						date: a.date,
						createdAt: a.createdAt,
					},
				}),
			),
		];
		return items.sort(
			(a, b) =>
				txDate(b).localeCompare(txDate(a)) ||
				txCreatedAt(b).localeCompare(txCreatedAt(a)),
		);
	}, [expenses, balanceAdjustments, budgetAdditions]);

	const {
		page,
		setPage,
		totalPages,
		totalItems,
		paged: pagedSorted,
		pageSize,
	} = usePagination(sorted, PAGE_SIZE);

	// ── Summary stats ─────────────────────────────────────────────────────────
	const fmt = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});

	const groupExpenses = expenses.filter((e) => e.source === "group");
	const personalExpenses = expenses.filter((e) => e.source === "personal");
	const totalGroup = groupExpenses.reduce((s, e) => s + e.amount, 0);
	const totalPersonal = personalExpenses.reduce((s, e) => s + e.amount, 0);
	const withReceipts = expenses.filter((e) => e.receiptUrl).length;

	return (
		<>
			<Card className="w-full shadow-sm">
				<CardHeader className="border-b">
					<CardTitle className="flex items-center gap-2">
						<ArrowLeftRight className="size-4" />
						Transactions
					</CardTitle>

					{sorted.length > 0 && (
						<div className="flex flex-wrap gap-1.5 mt-1">
							<Badge
								variant="outline"
								className="text-xs h-4 px-1.5"
							>
								{sorted.length} total
							</Badge>
							{expenses.length > 0 && (
								<Badge
									variant="outline"
									className="text-xs h-4 px-1.5"
								>
									{expenses.length} expense
									{expenses.length !== 1 ? "s" : ""}
								</Badge>
							)}
							{balanceAdjustments.length > 0 && (
								<Badge
									variant="outline"
									className="text-xs h-4 px-1.5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400"
								>
									{balanceAdjustments.length} adjustment
									{balanceAdjustments.length !== 1 ? "s" : ""}
								</Badge>
							)}
							{totalGroup > 0 && (
								<Badge
									variant="outline"
									className="text-xs h-4 px-1.5 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400"
								>
									Group {fmt.format(totalGroup)}
								</Badge>
							)}
							{totalPersonal > 0 && (
								<Badge
									variant="outline"
									className="text-xs h-4 px-1.5 border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/30 dark:text-violet-400"
								>
									Personal {fmt.format(totalPersonal)}
								</Badge>
							)}
							{withReceipts > 0 && (
								<Badge
									variant="outline"
									className="text-xs h-4 px-1.5"
								>
									{withReceipts} receipt
									{withReceipts !== 1 ? "s" : ""}
								</Badge>
							)}
						</div>
					)}
				</CardHeader>

				<CardContent className="p-0">
					{sorted.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
							<ArrowLeftRight className="size-8 opacity-30" />
							<p className="text-sm">No transactions yet</p>
							<p className="text-xs opacity-60">
								Add expenses or balance adjustments to get
								started
							</p>
						</div>
					) : (
						<div className="divide-y divide-border">
							{pagedSorted.map((item) =>
								item.kind === "expense" ? (
									<ExpenseRow
										key={`expense-${item.data.id}`}
										expense={item.data}
										members={members}
										currency={currency}
										onClick={() =>
											handleExpenseClick(item.data)
										}
									/>
								) : item.kind === "adjustment" ? (
									<AdjustmentRow
										key={`adjustment-${item.data.id}`}
										adjustment={item.data}
										members={members}
										currency={currency}
										onClick={() =>
											handleAdjustmentClick(item.data)
										}
									/>
								) : (
									<BudgetAdjustmentRow
										key={`budgetAddition-${item.data.id}`}
										adjustment={item.data}
										currency={currency}
										onClick={() =>
											handleBudgetAdjustmentClick(
												item.data,
											)
										}
									/>
								),
							)}
						</div>
					)}
				</CardContent>

				{totalPages > 1 && (
					<CardFooter>
						<Paginator
							page={page}
							totalPages={totalPages}
							totalItems={totalItems}
							pageSize={pageSize}
							onPageChange={setPage}
						/>
					</CardFooter>
				)}
			</Card>

			{/* Expense detail panel */}
			<ExpenseDetailPanel
				expenseId={selectedExpenseId}
				open={expenseDetailOpen}
				onOpenChange={handleExpenseDetailOpenChange}
			/>

			{/* Adjustment detail panel */}
			<AdjustmentDetailPanel
				adjustmentId={selectedAdjustmentId}
				open={adjustmentDetailOpen}
				onOpenChange={handleAdjustmentDetailOpenChange}
			/>
			<BudgetAdjustmentDetailPanel
				budgetId={selectedBudgetAdjustmentId}
				open={budgetAdjustmentDetailOpen}
				onOpenChange={handleBudgetAdjustmentDetailOpenChange}
			/>
		</>
	);
}
