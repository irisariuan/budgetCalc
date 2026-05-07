import * as React from "react";
import { Trash2, Receipt, ImageIcon, X, Users, User } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Expense, Member } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
	// Close on Escape
	React.useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
			onClick={onClose}
		>
			<button
				className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
				onClick={onClose}
				aria-label="Close"
			>
				<X className="size-5" />
			</button>
			<img
				src={src}
				alt={alt}
				className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			/>
		</div>
	);
}

// ─── Receipt thumbnail ─────────────────────────────────────────────────────────

function ReceiptThumb({ url, description }: { url: string; description: string }) {
	const [open, setOpen] = React.useState(false);
	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="group relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted hover:border-primary/50 transition-colors"
				title="View receipt"
				aria-label="View receipt photo"
			>
				<img
					src={url}
					alt="Receipt"
					className="h-full w-full object-cover"
					onError={(e) => {
						(e.currentTarget as HTMLImageElement).style.display = "none";
						(e.currentTarget.nextSibling as HTMLElement).style.display = "flex";
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
			{open && (
				<Lightbox
					src={url}
					alt={`Receipt: ${description}`}
					onClose={() => setOpen(false)}
				/>
			)}
		</>
	);
}

// ─── Expense row ──────────────────────────────────────────────────────────────

interface ExpenseRowProps {
	expense: Expense;
	members: Member[];
	currency: string;
	onDelete: (id: string) => void;
}

function ExpenseRow({ expense, members, currency, onDelete }: ExpenseRowProps) {
	const [confirmDelete, setConfirmDelete] = React.useState(false);

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

	const dateLabel = new Date(`${expense.date}T00:00:00Z`).toLocaleDateString(
		"en-US",
		{ month: "short", day: "numeric", timeZone: "UTC" },
	);

	return (
		<div className="flex items-start gap-3 px-4 py-3 group">
			{/* Receipt thumbnail or icon */}
			{expense.receiptUrl ? (
				<ReceiptThumb
					url={expense.receiptUrl}
					description={expense.description}
				/>
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
						className={`shrink-0 text-[10px] px-1.5 py-0 h-4 ${
							expense.source === "group"
								? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400"
								: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/30 dark:text-violet-400"
						}`}
					>
						{expense.source === "group" ? (
							<><Users className="size-2.5 mr-0.5" />Group</>
						) : (
							<><User className="size-2.5 mr-0.5" />Personal</>
						)}
					</Badge>
				</div>

				{/* Sub-info */}
				<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
					<span>{dateLabel}</span>
					{expense.source === "personal" && paidBy && (
						<>
							<span>·</span>
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
							<span>·</span>
							<span>split {splitNames.length > 3
								? `${splitNames.slice(0, 2).join(", ")} +${splitNames.length - 2}`
								: splitNames.join(", ")}
							</span>
						</>
					)}
				</div>
			</div>

			{/* Amount + delete */}
			<div className="flex shrink-0 flex-col items-end gap-1">
				<span className="font-mono text-sm font-semibold tabular-nums">
					{fmt.format(expense.amount)}
				</span>

				{confirmDelete ? (
					<div className="flex items-center gap-1">
						<button
							className="text-[10px] text-destructive hover:underline"
							onClick={() => onDelete(expense.id)}
						>
							Confirm
						</button>
						<span className="text-[10px] text-muted-foreground">/</span>
						<button
							className="text-[10px] text-muted-foreground hover:underline"
							onClick={() => setConfirmDelete(false)}
						>
							Cancel
						</button>
					</div>
				) : (
					<Button
						variant="ghost"
						size="icon-xs"
						className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
						onClick={() => setConfirmDelete(true)}
						aria-label="Delete expense"
					>
						<Trash2 className="size-3.5" />
					</Button>
				)}
			</div>
		</div>
	);
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ExpenseList() {
	const { state, actions } = useStore();
	const { expenses, members } = state;
	const currency = state.room?.currency ?? "USD";

	const sorted = React.useMemo(
		() => [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
		[expenses],
	);

	const groupExpenses = sorted.filter((e) => e.source === "group");
	const personalExpenses = sorted.filter((e) => e.source === "personal");

	const fmt = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});

	const totalGroup = groupExpenses.reduce((s, e) => s + e.amount, 0);
	const totalPersonal = personalExpenses.reduce((s, e) => s + e.amount, 0);

	const withReceipts = sorted.filter((e) => e.receiptUrl).length;

	return (
		<Card className="w-full shadow-sm">
			<CardHeader className="border-b">
				<CardTitle className="flex items-center gap-2">
					<Receipt className="size-4" />
					Expenses
				</CardTitle>
				{expenses.length > 0 && (
					<div className="flex flex-wrap gap-1.5 mt-1">
						<Badge variant="outline" className="text-[10px] h-4 px-1.5">
							{expenses.length} total
						</Badge>
						{totalGroup > 0 && (
							<Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400">
								Group {fmt.format(totalGroup)}
							</Badge>
						)}
						{totalPersonal > 0 && (
							<Badge variant="outline" className="text-[10px] h-4 px-1.5 border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/30 dark:text-violet-400">
								Personal {fmt.format(totalPersonal)}
							</Badge>
						)}
						{withReceipts > 0 && (
							<Badge variant="outline" className="text-[10px] h-4 px-1.5">
								{withReceipts} receipt{withReceipts !== 1 ? "s" : ""}
							</Badge>
						)}
					</div>
				)}
			</CardHeader>

			<CardContent className="p-0">
				{sorted.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
						<Receipt className="size-8 opacity-30" />
						<p className="text-sm">No expenses yet</p>
						<p className="text-xs opacity-60">
							Add your first expense using the button below
						</p>
					</div>
				) : (
					<div className="divide-y divide-border">
						{sorted.map((expense) => (
							<ExpenseRow
								key={expense.id}
								expense={expense}
								members={members}
								currency={currency}
								onDelete={(id) => actions.removeExpense(id)}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
