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
	Calendar,
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
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useStore } from "@/lib/store";
import type { Expense, Member, ExpenseSource } from "@/lib/types";
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
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
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
	return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

function fmtDateShort(dateStr: string): string {
	return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
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

// ─── Group Budget Area Chart ──────────────────────────────────────────────────

function GroupBudgetAtTimeChart({
	expense,
	currency,
}: {
	expense: Expense;
	currency: string;
}) {
	const { state } = useStore();

	const { data, lastPoint } = useMemo(() => {
		const filteredAdditions = state.budgetAdditions.filter(
			(a) => a.date <= expense.date,
		);
		const filteredExpenses = state.expenses.filter(
			(e) => e.source === "group" && e.date <= expense.date,
		);
		const d = generateBudgetChartData(filteredAdditions, filteredExpenses);
		return { data: d, lastPoint: d[d.length - 1] };
	}, [state.budgetAdditions, state.expenses, expense.date]);

	const chartConfig: ChartConfig = {
		added: { label: "Budget Added", color: "#10b981" },
		spent: { label: "Spent", color: "#f59e0b" },
		remaining: { label: "Remaining", color: "#3b82f6" },
	};

	const remaining = lastPoint?.remaining ?? 0;
	const isOver = remaining < 0;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap gap-1.5">
				<Badge
					variant="outline"
					className="text-sm h-5 px-2 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400"
				>
					Added&nbsp;{fmtCurrency(lastPoint?.added ?? 0, currency)}
				</Badge>
				<Badge
					variant="outline"
					className="text-sm h-5 px-2 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400"
				>
					Spent&nbsp;{fmtCurrency(lastPoint?.spent ?? 0, currency)}
				</Badge>
				<Badge
					variant="outline"
					className={`text-sm h-5 px-2 ${
						isOver
							? "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400"
							: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400"
					}`}
				>
					{isOver ? "Over " : "Remaining "}
					{fmtCurrency(Math.abs(remaining), currency)}
				</Badge>
			</div>
			<ChartContainer config={chartConfig} className="min-h-44 w-full">
				<AreaChart
					data={data}
					margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
				>
					<CartesianGrid strokeDasharray="3 3" vertical={false} />
					<XAxis
						dataKey="date"
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						minTickGap={40}
						interval="preserveStartEnd"
						tick={{ fontSize: 11 }}
						tickFormatter={fmtDateShort}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						tickMargin={4}
						width={68}
						tick={{ fontSize: 10 }}
						tickFormatter={(v: number) =>
							fmtCurrencyShort(v, currency)
						}
					/>
					<ChartTooltip
						content={
							<ChartTooltipContent
								labelFormatter={(v) => fmtDateShort(String(v))}
							/>
						}
					/>
					<Area
						type="monotone"
						dataKey="added"
						stroke="#10b981"
						fill="#10b981"
						fillOpacity={0.12}
						strokeWidth={2}
						dot={false}
					/>
					<Area
						type="monotone"
						dataKey="spent"
						stroke="#f59e0b"
						fill="#f59e0b"
						fillOpacity={0.12}
						strokeWidth={2}
						dot={false}
					/>
					<Area
						type="monotone"
						dataKey="remaining"
						stroke="#3b82f6"
						fill="#3b82f6"
						fillOpacity={0.12}
						strokeWidth={2}
						dot={false}
					/>
				</AreaChart>
			</ChartContainer>
		</div>
	);
}

// ─── View Content ─────────────────────────────────────────────────────────────

interface ViewContentProps {
	expense: Expense;
	onClose: () => void;
}

function ExpenseViewContent({ expense, onClose }: ViewContentProps) {
	const { state, actions } = useStore();
	const currency = state.room?.currency ?? "USD";
	const [deleting, setDeleting] = useState(false);
	const [copying, setCopying] = useState(false);

	const paidBy = state.members.find((m) => m.id === expense.paidById);
	const splitMembers = expense.splitAmong
		.map((id) => state.members.find((m) => m.id === id))
		.filter(Boolean) as Member[];

	const handleDelete = async () => {
		if (deleting) return;
		setDeleting(true);
		const captured = { ...expense, splitAmong: [...expense.splitAmong] };
		onClose();
		await actions.removeExpense(captured.id);
		toast("Expense deleted", {
			description: captured.description,
			action: {
				label: "Undo",
				onClick: () => actions.restoreExpense(captured),
			},
			duration: 5000,
		});
	};

	const handleCopy = async () => {
		if (copying) return;
		setCopying(true);
		try {
			await actions.addExpense({
				description: expense.description,
				amount: expense.amount,
				date: expense.date,
				source: expense.source,
				paidById: expense.paidById,
				splitAmong: expense.splitAmong,
				receipts: expense.receiptUrl?.map((url) => ({
					id: crypto.randomUUID(), // Generate new UUID for copied receipts
					url
				})) ?? [],
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
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted overflow-hidden">
					{expense.receiptUrl && expense.receiptUrl.length > 0 ? (
						<img
							src={expense.receiptUrl[0]}
							alt="Receipt"
							className="h-full w-full object-cover"
						/>
					) : (
						<ReceiptIcon className="size-5 text-muted-foreground" />
					)}
				</div>
				<div className="flex flex-1 min-w-0 flex-col gap-0.5">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-base font-semibold leading-tight wrap-break-word">
							{expense.description}
						</span>
						<Badge
							variant="outline"
							className={`shrink-0 text-sm px-1.5 py-0 h-4 ${
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
					<span className="font-mono text-2xl font-bold tabular-nums leading-tight">
						{fmtCurrency(expense.amount, currency)}
					</span>
				</div>
			</div>

			{/* Meta card */}
			<div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-muted/30 text-sm overflow-hidden">
				<div className="flex items-center gap-3 px-4 py-3">
					<Calendar className="size-3.5 shrink-0 text-muted-foreground" />
					<span className="text-muted-foreground">Date</span>
					<span className="ml-auto font-medium tabular-nums">
						{fmtDate(expense.date)}
					</span>
				</div>
				{expense.source === "personal" && paidBy && (
					<div className="flex items-center gap-3 px-4 py-3">
						<User className="size-3.5 shrink-0 text-muted-foreground" />
						<span className="text-muted-foreground">Paid by</span>
						<div className="ml-auto flex items-center gap-1.5">
							<span
								className="inline-block h-2 w-2 rounded-full"
								style={{ backgroundColor: paidBy.color }}
							/>
							<span className="font-medium">{paidBy.name}</span>
						</div>
					</div>
				)}
				{expense.source === "personal" && splitMembers.length > 0 && (
					<div className="flex items-start gap-3 px-4 py-3">
						<Users className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
						<span className="text-muted-foreground shrink-0">
							Split among
						</span>
						<div className="ml-auto flex flex-wrap justify-end gap-1">
							{splitMembers.map((m) => (
								<span
									key={m.id}
									className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
									style={{
										borderColor: `${m.color}55`,
										backgroundColor: `${m.color}18`,
										color: m.color,
									}}
								>
									<span
										className="inline-block h-1.5 w-1.5 rounded-full"
										style={{ backgroundColor: m.color }}
									/>
									{m.name}
								</span>
							))}
						</div>
					</div>
				)}
				{expense.source === "personal" && splitMembers.length > 1 && (
					<div className="flex items-center gap-3 px-4 py-3">
						<SplitSquareHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
						<span className="text-muted-foreground">
							Per person
						</span>
						<span className="ml-auto font-medium font-mono tabular-nums">
							{fmtCurrency(
								expense.amount / splitMembers.length,
								currency,
							)}
						</span>
					</div>
				)}
			</div>

			{/* Chart */}
			<div className="flex flex-col gap-2">
				<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{expense.source === "personal"
						? "Member Balances at This Date"
						: "Group Budget at This Date"}
				</span>
				{expense.source === "personal" ? (
					<BalancesAtTimeChart
						expense={expense}
						currency={currency}
					/>
				) : (
					<GroupBudgetAtTimeChart
						expense={expense}
						currency={currency}
					/>
				)}
			</div>

			{/* Full receipts */}
			{expense.receiptUrl && expense.receiptUrl.length > 0 && (
				<>
					<Separator />
					<div className="flex flex-col gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Receipt{expense.receiptUrl.length > 1 ? "s" : ""}
							{expense.receiptUrl.length > 1 && (
								<span className="ml-1 normal-case font-normal">
									({expense.receiptUrl.length})
								</span>
							)}
						</span>
						<div
							className={`grid gap-2 ${
								expense.receiptUrl.length === 1
									? "grid-cols-1"
									: "grid-cols-2"
							}`}
						>
							{expense.receiptUrl.map((url, i) => (
								<img
									key={url}
									src={url}
									alt={`Receipt ${i + 1}`}
									className="w-full rounded-xl border border-border object-cover"
								/>
							))}
						</div>
					</div>
				</>
			)}

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
	expense: Expense;
	onSaved: () => void;
	onCancel: () => void;
}

function ExpenseEditContent({ expense, onSaved, onCancel }: EditContentProps) {
	const { state, actions } = useStore();
	const currency = state.room?.currency ?? "USD";

	// Form state — initialised from current expense
	const [description, setDescription] = useState(expense.description);
	const [amountStr, setAmountStr] = useState(String(expense.amount));
	const [date, setDate] = useState(expense.date);
	const [source, setSource] = useState<ExpenseSource>(expense.source);
	const [paidById, setPaidById] = useState(expense.paidById ?? "");
	const [splitAmong, setSplitAmong] = useState<string[]>(expense.splitAmong);
	const [receipts, setReceipts] = useState<Receipt[]>([]);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);

	// Reset when a different expense is opened
	useEffect(() => {
		setDescription(expense.description);
		setAmountStr(String(expense.amount));
		setDate(expense.date);
		setSource(expense.source);
		setPaidById(expense.paidById ?? "");
		setSplitAmong(expense.splitAmong);
		setReceipts(expense.receiptUrl?.map((url) => ({
			id: crypto.randomUUID(), // Generate UUID for existing receipts
			url
		})) || []);
		setErrors({});
	}, [expense.id]);

	const amountNum = parseFloat(amountStr) || 0;
	const splitCount = splitAmong.length;
	const perShare =
		splitCount > 0 && amountNum > 0 ? amountNum / splitCount : 0;

	const toggleMember = (memberId: string) => {
		setSplitAmong((prev) =>
			prev.includes(memberId)
				? prev.filter((id) => id !== memberId)
				: [...prev, memberId],
		);
	};

	const allSelected =
		state.members.length > 0 && splitAmong.length === state.members.length;

	const validate = (): Record<string, string> => {
		const errs: Record<string, string> = {};
		if (!description.trim()) errs.description = "Description is required.";
		if (!amountStr || amountNum <= 0)
			errs.amount = "Amount must be greater than 0.";
		if (source === "personal") {
			if (!paidById) errs.paidBy = "Please select who paid.";
			if (splitAmong.length === 0)
				errs.splitAmong = "Select at least one member.";
		}
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
			await actions.updateExpense(expense.id, {
				description: description.trim(),
				amount: amountNum,
				date,
				source,
				paidById: source === "personal" ? paidById : null,
				splitAmong: source === "personal" ? splitAmong : [],
				receipts,
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

			{/* Date */}
			<div className="space-y-1.5">
				<Label>Date</Label>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="w-full justify-start text-left font-normal"
						>
							<Calendar className="mr-2 size-4 opacity-60" />
							{date
								? format(parseISO(date), "PPP")
								: "Pick a date"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<CalendarPicker
							mode="single"
							selected={date ? parseISO(date) : undefined}
							onSelect={(d) =>
								setDate(d ? format(d, "yyyy-MM-dd") : date)
							}
						/>
					</PopoverContent>
				</Popover>
			</div>

			{/* Source */}
			<div className="space-y-1.5">
				<Label>Type</Label>
				<div className="grid grid-cols-2 h-9 rounded-lg border border-input overflow-hidden">
					<button
						type="button"
						onClick={() => setSource("group")}
						className={`px-3 text-sm font-medium transition-colors ${
							source === "group"
								? "bg-primary text-primary-foreground"
								: "bg-transparent text-muted-foreground hover:bg-muted/60"
						}`}
					>
						Group Budget
					</button>
					<button
						type="button"
						onClick={() => setSource("personal")}
						className={`px-3 text-sm font-medium transition-colors border-l border-input ${
							source === "personal"
								? "bg-primary text-primary-foreground"
								: "bg-transparent text-muted-foreground hover:bg-muted/60"
						}`}
					>
						Personal
					</button>
				</div>
				<p className="text-xs text-muted-foreground">
					{source === "group"
						? "Deducted from the shared group fund."
						: "Paid by a member and split among selected."}
				</p>
			</div>

			{/* Personal-only fields */}
			{source === "personal" && (
				<>
					{/* Paid by */}
					<div className="space-y-1.5">
						<Label>Paid by</Label>
						<MemberSelect
							members={state.members}
							value={paidById}
							onValueChange={(val) => {
								setPaidById(val);
								if (errors.paidBy)
									setErrors((p) => ({ ...p, paidBy: "" }));
							}}
						/>
						{errors.paidBy && (
							<p className="text-sm text-destructive">
								{errors.paidBy}
							</p>
						)}
					</div>

					{/* Split among */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>Split among</Label>
							<button
								type="button"
								onClick={() =>
									setSplitAmong(
										allSelected
											? []
											: state.members.map((m) => m.id),
									)
								}
								className="text-xs text-primary hover:underline underline-offset-2"
							>
								{allSelected ? "Deselect all" : "Select all"}
							</button>
						</div>
						<div className="rounded-lg border border-input divide-y divide-border overflow-hidden">
							{state.members.map((m) => {
								const checked = splitAmong.includes(m.id);
								return (
									<label
										key={m.id}
										className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
									>
										<input
											type="checkbox"
											checked={checked}
											onChange={() => {
												toggleMember(m.id);
												if (errors.splitAmong)
													setErrors((p) => ({
														...p,
														splitAmong: "",
													}));
											}}
											className="accent-primary"
										/>
										<span
											className="inline-block size-2.5 rounded-full shrink-0"
											style={{ backgroundColor: m.color }}
										/>
										<span className="flex-1 text-sm">
											{m.name}
										</span>
									</label>
								);
							})}
						</div>
						{errors.splitAmong && (
							<p className="text-sm text-destructive">
								{errors.splitAmong}
							</p>
						)}
						{splitCount > 0 && amountNum > 0 && (
							<p className="text-xs text-muted-foreground px-0.5">
								Splits into{" "}
								<span className="font-semibold text-foreground">
									{splitCount} share
									{splitCount !== 1 ? "s" : ""}
								</span>{" "}
								of{" "}
								<span className="font-semibold text-foreground">
									{fmtCurrency(perShare, currency)}
								</span>{" "}
								each
							</p>
						)}
					</div>
				</>
			)}

			{/* Receipt */}
			<div className="space-y-1.5">
				<Label>
					Receipt photo{" "}
					<span className="text-muted-foreground font-normal">
						(optional)
					</span>
				</Label>
				<ReceiptEditor receipts={receipts} onChange={setReceipts} />
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

export interface ExpenseDetailPanelProps {
	expense: Expense | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ExpenseDetailPanel({
	expense,
	open,
	onOpenChange,
}: ExpenseDetailPanelProps) {
	const [isEditing, setIsEditing] = useState(false);

	// Reset edit mode when panel closes or a different expense is opened
	useEffect(() => {
		if (!open) setIsEditing(false);
	}, [open, expense?.id]);

	if (!expense) return null;

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
		<ExpenseEditContent
			expense={expense}
			onSaved={() => setIsEditing(false)}
			onCancel={() => setIsEditing(false)}
		/>
	) : (
		<ExpenseViewContent
			expense={expense}
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
