import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Rectangle,
	ReferenceLine,
	AreaChart,
	Area,
} from "recharts";
import {
	Trash2,
	Calendar as CalendarIcon,
	Users,
	User,
	Receipt as ReceiptIcon,
	DollarSign,
	SplitSquareHorizontal,
	Pencil,
	X,
	ImagePlus,
	AlertCircle,
	Loader2,
	Copy,
	BadgeDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useStore } from "@/lib/store";
import type {
	Expense,
	Member,
	ExpenseSource,
	BudgetAdjustment,
} from "@/lib/types";
import {
	calculateCurrentBalances,
	generateBudgetChartData,
} from "@/lib/chartUtils";
import { AutoPopup, useMediaQuery } from "./AutoPopup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberSelect } from "./MemberSelect";
import {
	DateTimePicker,
	DateTimePickerButton,
	normalizeTimestamp,
} from "@/components/DateTimePicker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { useEffect, useMemo, useState } from "react";
import ReceiptEditor, { type Receipt } from "./ReceiptEditor";
import { ReceiptGallery } from "./PhotoCarousel";
import { formatDateLong, formatDateShort } from "@/lib/dateFormat";
import { GroupBudgetAtTimeChart } from "./ExpenseDetailPanel";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCurrency(value: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

function fmtCurrencyShort(value: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

function fmtDate(dateStr: string): string {
	return formatDateLong(dateStr);
}

function fmtDateShort(dateStr: string): string {
	return formatDateShort(dateStr);
}

// ─── Member Balances Bar Chart ────────────────────────────────────────────────

function BalancesAtTimeChart({
	expense,
	currency,
}: {
	expense: Expense;
	currency: string;
}) {
	const { state } = useStore();

	const chartData = useMemo(() => {
		const filteredExpenses = state.expenses.filter(
			(e) => e.source === "personal" && e.date <= expense.date,
		);
		const filteredAdjustments = state.balanceAdjustments.filter(
			(a) => a.date <= expense.date,
		);
		const balances = calculateCurrentBalances(
			state.members,
			filteredExpenses,
			filteredAdjustments,
		);
		return state.members.map((m) => ({
			name: m.name,
			balance: Math.round((balances[m.id] ?? 0) * 100) / 100,
			color: m.color,
		}));
	}, [state.expenses, state.members, state.balanceAdjustments, expense.date]);

	const chartConfig = useMemo<ChartConfig>(() => {
		const cfg: ChartConfig = {};
		for (const m of state.members)
			cfg[m.id] = { label: m.name, color: m.color };
		return cfg;
	}, [state.members]);

	if (state.members.length === 0) return null;

	const hasAnyBalance = chartData.some((d) => d.balance !== 0);
	if (!hasAnyBalance) {
		return (
			<div className="flex flex-col items-center justify-center gap-1.5 py-8 text-muted-foreground rounded-lg border border-dashed border-border">
				<DollarSign className="size-6 opacity-30" />
				<p className="text-sm">All balances are zero at this date</p>
			</div>
		);
	}

	return (
		<ChartContainer config={chartConfig} className="min-h-44 w-full">
			<BarChart
				data={chartData}
				margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
			>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="name"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					tick={{ fontSize: 11 }}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					tickMargin={4}
					width={68}
					tick={{ fontSize: 10 }}
					tickFormatter={(v: number) => fmtCurrencyShort(v, currency)}
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							formatter={(value, name) => (
								<div className="flex flex-1 items-center justify-between gap-4">
									<span className="text-muted-foreground">
										{String(name)}
									</span>
									<span className="font-mono font-semibold">
										{fmtCurrency(Number(value), currency)}
									</span>
								</div>
							)}
						/>
					}
				/>
				<ReferenceLine
					y={0}
					stroke="#94a3b8"
					strokeDasharray="4 4"
					strokeWidth={1.5}
				/>
				<Bar
					dataKey="balance"
					name="Balance"
					radius={[4, 4, 0, 0]}
					shape={({ color, ...props }: any) => (
						<Rectangle {...props} fill={color} fillOpacity={0.85} />
					)}
				/>
			</BarChart>
		</ChartContainer>
	);
}

// ─── View Content ─────────────────────────────────────────────────────────────

interface ViewContentProps {
	budget: BudgetAdjustment;
	onClose: () => void;
}

function BudgetViewContent({ budget, onClose }: ViewContentProps) {
	const { state, actions } = useStore();
	const currency = state.room?.currency ?? "USD";
	const [deleting, setDeleting] = useState(false);
	const [copying, setCopying] = useState(false);

	const handleDelete = async () => {
		if (deleting) return;
		setDeleting(true);
		onClose();
		await actions.removeBudgetAddition(budget.id);
		toast("Budget deleted", {
			duration: 5000,
			action: {
				label: "Undo",
				onClick: () => actions.addBudgetAddition(budget),
			},
		});
	};

	const handleCopy = async () => {
		if (copying) return;
		setCopying(true);
		try {
			await actions.addBudgetAddition({
				description: budget.description,
				amount: budget.amount,
				date: budget.createdAt,
			});
			onClose();
			toast.success("Expense duplicated");
		} finally {
			setCopying(false);
		}
	};

	return (
		<div className="flex flex-col gap-5 px-4 pb-6">
			{/* Hero */}
			<div className="flex items-start gap-3 pt-1">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-amber-500 overflow-hidden">
					<BadgeDollarSign />
				</div>
				<div className="flex flex-1 min-w-0 flex-col gap-0.5">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-base font-semibold leading-tight wrap-break-word">
							{budget.description}
						</span>
						<Badge
							variant="outline"
							className="shrink-0 text-sm px-1.5 py-0 h-4 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400"
						>
							<Users className="size-2.5 mr-0.5" />
							Group
						</Badge>
					</div>
					<span className="font-mono text-2xl font-bold tabular-nums leading-tight">
						{fmtCurrency(budget.amount, currency)}
					</span>
				</div>
			</div>

			{/* Meta card */}
			<div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-muted/30 text-sm overflow-hidden">
				<div className="flex items-center gap-3 px-4 py-3">
					<CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
					<span className="text-muted-foreground">Date</span>
					<span className="ml-auto font-medium tabular-nums">
						{fmtDate(budget.date)}
					</span>
				</div>
			</div>

			{/* Chart */}
			<div className="flex flex-col gap-2">
				<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Group Budget at This Date
				</span>
				<GroupBudgetAtTimeChart
					currency={currency}
					date={new Date(budget.date)}
				/>
			</div>

			<Separator />
			<div className="flex gap-2">
				<Button
					variant="outline"
					className="flex-1"
					onClick={handleCopy}
					disabled={copying || deleting}
				>
					{copying ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Copy className="size-4" />
					)}
					Duplicate
				</Button>
				<Button
					variant="destructive"
					className="flex-1"
					onClick={handleDelete}
					disabled={deleting || copying}
				>
					{deleting ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Trash2 className="size-4" />
					)}
					Delete
				</Button>
			</div>
		</div>
	);
}

// ─── Edit Content ─────────────────────────────────────────────────────────────

interface EditContentProps {
	budget: BudgetAdjustment;
	onSaved: () => void;
	onCancel: () => void;
}

function BudgetEditContent({ budget, onSaved, onCancel }: EditContentProps) {
	const { state, actions } = useStore();
	const currency = state.room?.currency ?? "USD";

	// Form state — initialised from current expense
	const [description, setDescription] = useState(budget.description);
	const [amountStr, setAmountStr] = useState(String(budget.amount));
	const [date, setDate] = useState(normalizeTimestamp(budget.date));
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);

	// Reset when a different expense is opened
	useEffect(() => {
		setDescription(budget.description);
		setAmountStr(String(budget.amount));
		setDate(normalizeTimestamp(budget.date));
		setErrors({});
	}, [budget.id]);

	const amountNum = parseFloat(amountStr) || 0;

	const validate = (): Record<string, string> => {
		const errs: Record<string, string> = {};
		if (!description.trim()) errs.description = "Description is required.";
		if (amountNum <= 0) errs.amount = "Amount must be greater than zero.";
		return errs;
	};

	const handleSave = async () => {
		const errs = validate();
		if (Object.keys(errs).length > 0) {
			setErrors(errs);
			return;
		}
		setSaving(true);
		try {
			await actions.updateBudgetAddition(budget.id, {
				description: description.trim(),
				amount: amountNum,
				date: date,
			});
			toast.success("Expense updated");
			onSaved();
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex flex-col gap-5 px-4 pb-6">
			{/* Description */}
			<div className="space-y-1.5">
				<Label htmlFor="exp-edit-desc">Description</Label>
				<Input
					id="exp-edit-desc"
					value={description}
					onChange={(e) => {
						setDescription(e.target.value);
						if (errors.description)
							setErrors((p) => ({ ...p, description: "" }));
					}}
					autoComplete="off"
				/>
				{errors.description && (
					<p className="text-sm text-destructive">
						{errors.description}
					</p>
				)}
			</div>

			{/* Amount */}
			<div className="space-y-1.5">
				<Label htmlFor="exp-edit-amount">Amount</Label>
				<Input
					id="exp-edit-amount"
					type="number"
					placeholder="0.00"
					min="0.01"
					step="0.01"
					value={amountStr}
					onChange={(e) => {
						setAmountStr(e.target.value);
						if (errors.amount)
							setErrors((p) => ({ ...p, amount: "" }));
					}}
				/>
				{errors.amount && (
					<p className="text-sm text-destructive">{errors.amount}</p>
				)}
			</div>

			{/* Date & Time */}
			<div className="space-y-1.5">
				<Label>Date & Time</Label>
				<DateTimePickerButton date={date} setDate={setDate} />
			</div>

			{/* Actions */}
			<Separator />
			<div className="flex gap-2">
				<Button
					variant="outline"
					className="flex-1"
					onClick={onCancel}
					disabled={saving}
				>
					Cancel
				</Button>
				<Button
					className="flex-1"
					onClick={handleSave}
					disabled={saving}
				>
					{saving && <Loader2 className="size-4 animate-spin" />}
					Save Changes
				</Button>
			</div>
		</div>
	);
}

// ─── Public Panel (Dialog on desktop, Drawer on mobile) ──────────────────────

export interface BudgetDetailPanelProps {
	budgetId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function BudgetAdjustmentDetailPanel({
	budgetId,
	open,
	onOpenChange,
}: BudgetDetailPanelProps) {
	const { state } = useStore();
	const [isEditing, setIsEditing] = useState(false);

	// Look up the current budget from store by ID to always get fresh data
	const budget = budgetId
		? state.budgetAdditions.find((e) => e.id === budgetId) || null
		: null;

	// Reset edit mode when panel closes or a different expense is opened
	useEffect(() => {
		if (!open) setIsEditing(false);
	}, [open, budgetId]);

	if (!budget) return null;

	const headerContent = (
		<div className="flex items-center justify-between w-full">
			<span className="font-semibold">
				{isEditing ? "Edit Expense" : "Expense Details"}
			</span>
			{!isEditing ? (
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setIsEditing(true)}
					aria-label="Edit expense"
				>
					<Pencil className="size-4" />
				</Button>
			) : (
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setIsEditing(false)}
					aria-label="Cancel editing"
				>
					<X className="size-4" />
				</Button>
			)}
		</div>
	);

	const body = isEditing ? (
		<BudgetEditContent
			budget={budget}
			onSaved={() => setIsEditing(false)}
			onCancel={() => setIsEditing(false)}
		/>
	) : (
		<BudgetViewContent
			budget={budget}
			onClose={() => onOpenChange(false)}
		/>
	);

	return (
		<AutoPopup
			open={open}
			onOpenChange={onOpenChange}
			header={headerContent}
		>
			{body}
		</AutoPopup>
	);
}
