import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	ReferenceLine,
} from "recharts";
import {
	Trash2,
	Calendar as CalendarIcon,
	SlidersHorizontal,
	TrendingUp,
	TrendingDown,
	Pencil,
	X,
	Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useStore } from "@/lib/store";
import type { BalanceAdjustment } from "@/lib/types";
import { generateBalanceChartData } from "@/lib/chartUtils";
import { AutoPopup, useMediaQuery } from "./AutoPopup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberSelect } from "./MemberSelect";
import {
	DateTimePicker,
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
import { formatDateLong, formatDateShort } from "@/lib/dateFormat";

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

// ─── Member Balance Chart ─────────────────────────────────────────────────────

function MemberBalanceChart({
	adjustment,
	currency,
}: {
	adjustment: BalanceAdjustment;
	currency: string;
}) {
	const { state } = useStore();
	const member = state.members.find((m) => m.id === adjustment.memberId);

	const { chartData, chartConfig } = useMemo(() => {
		if (!member) return { chartData: [], chartConfig: {} as ChartConfig };
		const filteredExpenses = state.expenses.filter(
			(e) => e.source === "personal" && e.date <= adjustment.date,
		);
		const filteredAdjustments = state.balanceAdjustments.filter(
			(a) => a.date <= adjustment.date,
		);
		const raw = generateBalanceChartData(
			[member],
			filteredExpenses,
			filteredAdjustments,
		);
		const data = raw.map((point) => ({
			date: point.date as string,
			balance: (point[member.id] as number) ?? 0,
		}));
		const cfg: ChartConfig = {
			balance: { label: member.name, color: member.color },
		};
		return { chartData: data, chartConfig: cfg };
	}, [
		member,
		state.expenses,
		state.balanceAdjustments,
		adjustment.date,
		adjustment.memberId,
	]);

	if (!member || chartData.length === 0) return null;

	const hasVariation = chartData.some((d) => d.balance !== 0);
	if (!hasVariation) {
		return (
			<div className="flex flex-col items-center justify-center gap-1.5 py-8 text-muted-foreground rounded-lg border border-dashed border-border">
				<SlidersHorizontal className="size-6 opacity-30" />
				<p className="text-sm">Balance is zero at this date</p>
			</div>
		);
	}

	return (
		<ChartContainer config={chartConfig} className="min-h-44 w-full">
			<AreaChart
				data={chartData}
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
					tickFormatter={(v: number) => fmtCurrencyShort(v, currency)}
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							labelFormatter={(v) => fmtDateShort(String(v))}
							formatter={(value) => (
								<div className="flex flex-1 items-center justify-between gap-4">
									<span className="text-muted-foreground">
										{member.name}
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
				<Area
					type="monotone"
					dataKey="balance"
					stroke={member.color}
					fill={member.color}
					fillOpacity={0.15}
					strokeWidth={2}
					dot={false}
				/>
			</AreaChart>
		</ChartContainer>
	);
}

// ─── View Content ─────────────────────────────────────────────────────────────

interface ViewContentProps {
	adjustment: BalanceAdjustment;
	onClose: () => void;
}

function AdjustmentViewContent({ adjustment, onClose }: ViewContentProps) {
	const { state, actions } = useStore();
	const currency = state.room?.currency ?? "USD";
	const [deleting, setDeleting] = useState(false);

	const member = state.members.find((m) => m.id === adjustment.memberId);
	const isCredit = adjustment.amount >= 0;

	const handleDelete = async () => {
		if (deleting) return;
		setDeleting(true);
		const captured = { ...adjustment };
		onClose();
		await actions.removeBalanceAdjustment(captured.id);
		toast("Adjustment deleted", {
			description: captured.description,
			action: {
				label: "Undo",
				onClick: () => actions.restoreBalanceAdjustment(captured),
			},
			duration: 5000,
		});
	};

	return (
		<div className="flex flex-col gap-5 px-4 pb-6">
			{/* Hero */}
			<div className="flex items-start gap-3 pt-1">
				<div
					className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
					style={{ backgroundColor: member?.color ?? "#94a3b8" }}
				>
					{member?.name.charAt(0).toUpperCase() ?? "?"}
				</div>
				<div className="flex flex-1 min-w-0 flex-col gap-0.5">
					<div className="flex flex-wrap items-center gap-2">
						{adjustment.description && (
							<span className="text-base font-semibold leading-tight wrap-break-word">
								{adjustment.description}
							</span>
						)}
						<Badge
							variant="outline"
							className="shrink-0 text-sm px-1.5 py-0 h-4 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400"
						>
							<SlidersHorizontal className="size-2.5 mr-0.5" />
							Adjustment
						</Badge>
					</div>
					<span
						className={`font-mono text-2xl font-bold tabular-nums leading-tight ${
							isCredit
								? "text-emerald-600 dark:text-emerald-400"
								: "text-red-600 dark:text-red-400"
						}`}
					>
						{isCredit ? "+" : ""}
						{fmtCurrency(adjustment.amount, currency)}
					</span>
				</div>
			</div>

			{/* Meta */}
			<div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-muted/30 text-sm overflow-hidden">
				<div className="flex items-center gap-3 px-4 py-3">
					<CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
					<span className="text-muted-foreground">Date</span>
					<span className="ml-auto font-medium tabular-nums">
						{fmtDate(adjustment.date)}
					</span>
				</div>
				<div className="flex items-center gap-3 px-4 py-3">
					{isCredit ? (
						<TrendingUp className="size-3.5 shrink-0 text-emerald-500" />
					) : (
						<TrendingDown className="size-3.5 shrink-0 text-red-500" />
					)}
					<span className="text-muted-foreground">Type</span>
					<span
						className={`ml-auto font-medium ${
							isCredit
								? "text-emerald-600 dark:text-emerald-400"
								: "text-red-600 dark:text-red-400"
						}`}
					>
						{isCredit ? "Credit (balance +)" : "Debit (balance −)"}
					</span>
				</div>
				{member && (
					<div className="flex items-center gap-3 px-4 py-3">
						<span
							className="size-3.5 shrink-0 rounded-full"
							style={{ backgroundColor: member.color }}
						/>
						<span className="text-muted-foreground">Member</span>
						<span className="ml-auto font-medium">
							{member.name}
						</span>
					</div>
				)}
			</div>

			{/* Chart */}
			<div className="flex flex-col gap-2">
				<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{member?.name ?? "Member"}'s Balance History
				</span>
				<MemberBalanceChart
					adjustment={adjustment}
					currency={currency}
				/>
			</div>

			<Separator />
			<Button
				variant="destructive"
				className="w-full"
				onClick={handleDelete}
				disabled={deleting}
			>
				{deleting ? (
					<Loader2 className="size-4 animate-spin" />
				) : (
					<Trash2 className="size-4" />
				)}
				Delete Adjustment
			</Button>
		</div>
	);
}

// ─── Edit Content ─────────────────────────────────────────────────────────────

interface EditContentProps {
	adjustment: BalanceAdjustment;
	onSaved: () => void;
	onCancel: () => void;
}

function AdjustmentEditContent({
	adjustment,
	onSaved,
	onCancel,
}: EditContentProps) {
	const { state, actions } = useStore();
	const currency = state.room?.currency ?? "USD";

	const [description, setDescription] = useState(adjustment.description);
	const [amountStr, setAmountStr] = useState(
		String(Math.abs(adjustment.amount)),
	);
	const [amountSign, setAmountSign] = useState<"+" | "-">(
		adjustment.amount >= 0 ? "+" : "-",
	);
	const [date, setDate] = useState(normalizeTimestamp(adjustment.date));
	const [memberId, setMemberId] = useState(adjustment.memberId);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);

	// Reset when the adjustment changes (different row opened)
	useEffect(() => {
		setDescription(adjustment.description);
		setAmountStr(String(Math.abs(adjustment.amount)));
		setAmountSign(adjustment.amount >= 0 ? "+" : "-");
		setDate(normalizeTimestamp(adjustment.date));
		setMemberId(adjustment.memberId);
		setErrors({});
	}, [adjustment.id]);

	const amountNum = parseFloat(amountStr) || 0;
	const finalAmount = amountSign === "+" ? amountNum : -amountNum;

	const validate = (): Record<string, string> => {
		const errs: Record<string, string> = {};
		if (!description.trim()) errs.description = "Description is required.";
		if (!amountStr || amountNum <= 0)
			errs.amount = "Amount must be greater than 0.";
		if (!memberId) errs.memberId = "Please select a member.";
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
			await actions.updateBalanceAdjustment(adjustment.id, {
				memberId,
				amount: finalAmount,
				description: description.trim(),
				date,
			});
			toast.success("Adjustment updated");
			onSaved();
		} finally {
			setSaving(false);
		}
	};

	const member = state.members.find((m) => m.id === memberId);

	return (
		<div className="flex flex-col gap-5 px-4 pb-6">
			{/* Description */}
			<div className="space-y-1.5">
				<Label htmlFor="adj-description">Description</Label>
				<Input
					id="adj-description"
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

			{/* Amount with sign toggle */}
			<div className="space-y-1.5">
				<Label>Amount</Label>
				<div className="flex gap-2">
					{/* Sign toggle */}
					<div className="flex h-9 rounded-lg border border-input overflow-hidden shrink-0">
						<button
							type="button"
							onClick={() => setAmountSign("+")}
							className={`w-10 font-semibold text-sm transition-colors ${
								amountSign === "+"
									? "bg-emerald-600 text-white"
									: "bg-transparent text-muted-foreground hover:bg-muted/60"
							}`}
						>
							+
						</button>
						<button
							type="button"
							onClick={() => setAmountSign("-")}
							className={`w-10 font-semibold text-sm transition-colors border-l border-input ${
								amountSign === "-"
									? "bg-red-600 text-white"
									: "bg-transparent text-muted-foreground hover:bg-muted/60"
							}`}
						>
							−
						</button>
					</div>
					<Input
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
						className="flex-1"
					/>
				</div>
				{amountNum > 0 && (
					<p className="text-xs text-muted-foreground">
						Will{" "}
						<span
							className={
								amountSign === "+"
									? "text-emerald-600 font-medium"
									: "text-red-600 font-medium"
							}
						>
							{amountSign === "+" ? "add" : "subtract"}{" "}
							{fmtCurrency(amountNum, currency)}
						</span>{" "}
						{amountSign === "+" ? "to" : "from"}{" "}
						{member?.name ?? "member"}'s balance
					</p>
				)}
				{errors.amount && (
					<p className="text-sm text-destructive">{errors.amount}</p>
				)}
			</div>

			{/* Date & Time */}
			<div className="space-y-1.5">
				<Label>Date & Time</Label>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="w-full justify-start text-left font-normal"
						>
							<CalendarIcon className="mr-2 size-4 opacity-60" />
							{date
								? format(
										parseISO(normalizeTimestamp(date)),
										"PPP, h:mm a",
									)
								: "Pick a date & time"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<DateTimePicker
							value={normalizeTimestamp(date)}
							onChange={setDate}
						/>
					</PopoverContent>
				</Popover>
			</div>

			{/* Member */}
			<div className="space-y-1.5">
				<Label>Member</Label>
				<MemberSelect
					members={state.members}
					value={memberId}
					onValueChange={(val) => {
						setMemberId(val);
						if (errors.memberId)
							setErrors((p) => ({ ...p, memberId: "" }));
					}}
				/>
				{errors.memberId && (
					<p className="text-sm text-destructive">
						{errors.memberId}
					</p>
				)}
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
					{saving ? (
						<Loader2 className="size-4 animate-spin" />
					) : null}
					Save Changes
				</Button>
			</div>
		</div>
	);
}

// ─── Public Panel ─────────────────────────────────────────────────────────────

export interface AdjustmentDetailPanelProps {
	adjustmentId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AdjustmentDetailPanel({
	adjustmentId,
	open,
	onOpenChange,
}: AdjustmentDetailPanelProps) {
	const { state } = useStore();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isEditing, setIsEditing] = useState(false);

	// Look up current adjustment from store by ID
	const adjustment = adjustmentId
		? state.balanceAdjustments.find((a) => a.id === adjustmentId) || null
		: null;

	// Reset edit mode whenever a new adjustment is shown or panel closes
	useEffect(() => {
		if (!open) setIsEditing(false);
	}, [open, adjustmentId]);

	if (!adjustment) return null;

	const headerContent = (
		<div className="flex items-center justify-between w-full">
			<span className="text-sm font-semibold">
				{isEditing ? "Edit Adjustment" : "Adjustment Details"}
			</span>
			{!isEditing ? (
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setIsEditing(true)}
					aria-label="Edit adjustment"
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
		<AdjustmentEditContent
			adjustment={adjustment}
			onSaved={() => setIsEditing(false)}
			onCancel={() => setIsEditing(false)}
		/>
	) : (
		<AdjustmentViewContent
			adjustment={adjustment}
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
