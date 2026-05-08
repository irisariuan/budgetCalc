import { useStore } from "@/lib/store";
import type { ExpenseSource } from "@/lib/types";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberSelect } from "./MemberSelect";
import { ImagePlus, X, AlertCircle, CalendarIcon } from "lucide-react";
import {
	useRef,
	useState,
	type ChangeEvent,
	useEffect,
	useCallback,
	type SubmitEvent,
	type DragEvent,
} from "react";
import { format, parseISO } from "date-fns";
import { DateTimePicker, DateTimePickerButton, nowTimestamp } from "@/components/DateTimePicker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import ReceiptEditor, { type Receipt } from "./ReceiptEditor";

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddExpenseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddExpenseDialog({
	open,
	onOpenChange,
}: AddExpenseDialogProps) {
	const { state, actions } = useStore();
	const { members } = state;

	// Form state
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(nowTimestamp);
	const [source, setSource] = useState<ExpenseSource>("group");
	const [paidById, setPaidById] = useState("");
	const [splitAmong, setSplitAmong] = useState<string[]>([]);
	const [receipts, setReceipts] = useState<Receipt[]>([]);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Pre-select all members when dialog opens
	useEffect(() => {
		if (open) {
			setSplitAmong(members.map((m) => m.id));
		}
	}, [open, members]);

	const resetForm = useCallback(() => {
		setDescription("");
		setAmount("");
		setDate(nowTimestamp());
		setSource("group");
		setPaidById("");
		setSplitAmong(members.map((m) => m.id));
		if (receipts.length > 0) {
			for (const r of receipts) {
				if (r.url.startsWith("blob:")) URL.revokeObjectURL(r.url);
			}
		}
		setReceipts([]);
		setErrors({});
	}, [members, receipts]);

	const handleOpenChange = (val: boolean) => {
		if (!val) resetForm();
		onOpenChange(val);
	};

	// ── Split helpers ──────────────────────────────────────────────────────────

	const toggleMember = (memberId: string) => {
		setSplitAmong((prev) =>
			prev.includes(memberId)
				? prev.filter((id) => id !== memberId)
				: [...prev, memberId],
		);
	};

	const allSelected =
		members.length > 0 && splitAmong.length === members.length;

	const toggleAll = () => {
		setSplitAmong(allSelected ? [] : members.map((m) => m.id));
	};

	// ── Derived values ─────────────────────────────────────────────────────────

	const amountNum = parseFloat(amount) || 0;
	const splitCount = splitAmong.length;
	const perShare =
		splitCount > 0 && amountNum > 0 ? amountNum / splitCount : 0;

	// ── Validation ─────────────────────────────────────────────────────────────

	const validate = (): Record<string, string> => {
		const errs: Record<string, string> = {};
		if (!description.trim()) errs.description = "Description is required.";
		if (!amount || amountNum <= 0)
			errs.amount = "Amount must be greater than 0.";
		if (source === "personal") {
			if (!paidById) errs.paidBy = "Please select who paid.";
			if (splitAmong.length === 0)
				errs.splitAmong = "Select at least one member.";
		}
		return errs;
	};

	// ── Submit ─────────────────────────────────────────────────────────────────

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		const errs = validate();
		if (Object.keys(errs).length > 0) {
			setErrors(errs);
			return;
		}
		setIsSubmitting(true);
		try {
			await actions.addExpense({
				description: description.trim(),
				amount: amountNum,
				date,
				source,
				paidById: source === "personal" ? paidById : null,
				splitAmong: source === "personal" ? splitAmong : [],
				receipts,
			});
			resetForm();
			onOpenChange(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	// ── Render ─────────────────────────────────────────────────────────────────

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add Expense</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* ── Description ── */}
					<div className="space-y-1.5">
						<Label htmlFor="exp-description">Description</Label>
						<Input
							id="exp-description"
							placeholder="e.g. Dinner at Sakura"
							value={description}
							onChange={(e) => {
								setDescription(e.target.value);
								if (errors.description)
									setErrors((p) => ({
										...p,
										description: "",
									}));
							}}
							autoComplete="off"
						/>
						{errors.description && (
							<p className="text-sm text-destructive">
								{errors.description}
							</p>
						)}
					</div>

					{/* ── Amount ── */}
					<div className="space-y-1.5">
						<Label htmlFor="exp-amount">Amount</Label>
						<Input
							id="exp-amount"
							type="number"
							placeholder="0.00"
							min="0.01"
							step="0.01"
							value={amount}
							onChange={(e) => {
								setAmount(e.target.value);
								if (errors.amount)
									setErrors((p) => ({ ...p, amount: "" }));
							}}
						/>
						{errors.amount && (
							<p className="text-sm text-destructive">
								{errors.amount}
							</p>
						)}
					</div>

					{/* ── Date & Time ── */}
					<div className="space-y-1.5">
						<Label>Date & Time</Label>
						<DateTimePickerButton date={date} setDate={setDate} />
					</div>

					{/* ── Source toggle ── */}
					<div className="space-y-1.5">
						<Label>Source</Label>
						<div className="grid grid-cols-2 h-9 rounded-lg border border-input overflow-hidden">
							<button
								type="button"
								onClick={() => setSource("group")}
								className={`px-3 font-medium transition-colors ${
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
								className={`px-3 font-medium transition-colors border-l border-input ${
									source === "personal"
										? "bg-primary text-primary-foreground"
										: "bg-transparent text-muted-foreground hover:bg-muted/60"
								}`}
							>
								Personal
							</button>
						</div>
						<p className="text-sm text-muted-foreground">
							{source === "group"
								? "Deducted from the shared group fund."
								: "Paid by a member and split among selected."}
						</p>
					</div>

					{/* ── Personal-only fields ── */}
					{source === "personal" && (
						<>
							{/* Paid by */}
							<div className="space-y-1.5">
								<Label>Paid by</Label>
								<MemberSelect
									members={members}
									value={paidById}
									onValueChange={(val) => {
										setPaidById(val);
										if (errors.paidBy)
											setErrors((p) => ({
												...p,
												paidBy: "",
											}));
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
										onClick={toggleAll}
										className="text-sm text-primary hover:underline underline-offset-2 transition-colors"
									>
										{allSelected
											? "Deselect all"
											: "Select all"}
									</button>
								</div>

								{/* Member checkboxes */}
								<div className="rounded-lg border border-input divide-y divide-border overflow-hidden">
									{members.length === 0 ? (
										<p className="px-3 py-2.5 text-muted-foreground text-center">
											No members in this room yet.
										</p>
									) : (
										members.map((m) => {
											const checked = splitAmong.includes(
												m.id,
											);
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
															if (
																errors.splitAmong
															)
																setErrors(
																	(p) => ({
																		...p,
																		splitAmong:
																			"",
																	}),
																);
														}}
														className="accent-primary"
													/>
													<span
														className="inline-block size-2.5 rounded-full shrink-0"
														style={{
															backgroundColor:
																m.color,
														}}
													/>
													<span className="flex-1">
														{m.name}
													</span>
												</label>
											);
										})
									)}
								</div>

								{errors.splitAmong && (
									<p className="text-sm text-destructive">
										{errors.splitAmong}
									</p>
								)}

								{/* Split preview */}
								{splitCount > 0 && amountNum > 0 && (
									<p className="text-sm text-muted-foreground px-0.5">
										Splits into{" "}
										<span className="font-semibold text-foreground">
											{splitCount} share
											{splitCount !== 1 ? "s" : ""}
										</span>{" "}
										of{" "}
										<span className="font-semibold text-foreground">
											${perShare.toFixed(2)}
										</span>{" "}
										each
									</p>
								)}
							</div>
						</>
					)}

					{/* ── Receipt photo ── */}
					<div className="space-y-1.5">
						<Label>
							Receipt photo{" "}
							<span className="text-muted-foreground font-normal">
								(optional)
							</span>
						</Label>
						<ReceiptEditor
							receipts={receipts}
							onChange={setReceipts}
						/>
					</div>

					{/* ── Footer ── */}
					<DialogFooter>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="w-full sm:w-auto"
						>
							{isSubmitting ? "Adding…" : "Add Expense"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
