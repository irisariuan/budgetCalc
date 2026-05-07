import { useStore } from "@/lib/store";
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
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useState, type SubmitEvent } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddBudgetDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayString() {
	return new Date().toISOString().split("T")[0];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddBudgetDialog({ open, onOpenChange }: AddBudgetDialogProps) {
	const { actions } = useStore();

	// Form state
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(getTodayString);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ── Reset / open change ────────────────────────────────────────────────────

	const resetForm = () => {
		setDescription("");
		setAmount("");
		setDate(getTodayString());
		setErrors({});
	};

	const handleOpenChange = (val: boolean) => {
		if (!val) resetForm();
		onOpenChange(val);
	};

	// ── Validation ─────────────────────────────────────────────────────────────

	const amountNum = parseFloat(amount) || 0;

	const validate = (): Record<string, string> => {
		const errs: Record<string, string> = {};
		if (!amount || amountNum <= 0)
			errs.amount = "Amount must be greater than 0.";
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
			await actions.addBudgetAddition({
				description: description.trim(),
				amount: amountNum,
				date,
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
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Add to Group Budget</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* ── Description ── */}
					<div className="space-y-1.5">
						<Label htmlFor="budget-description">
							Description{" "}
							<span className="text-muted-foreground font-normal text-sm">
								(optional)
							</span>
						</Label>
						<Input
							id="budget-description"
							placeholder="e.g. Initial fund, Top-up"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							autoComplete="off"
						/>
					</div>

					{/* ── Amount ── */}
					<div className="space-y-1.5">
						<Label htmlFor="budget-amount">Amount</Label>
						<Input
							id="budget-amount"
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

					{/* ── Date ── */}
					<div className="space-y-1.5">
						<Label>Date</Label>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									type="button"
									variant="outline"
									className="w-full justify-start text-left font-normal"
								>
									<CalendarIcon className="mr-2 size-4 opacity-60" />
									{date
										? format(parseISO(date), "PPP")
										: "Pick a date"}
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="w-auto p-0"
								align="start"
							>
								<Calendar
									mode="single"
									selected={date ? parseISO(date) : undefined}
									onSelect={(d) =>
										setDate(
											d ? format(d, "yyyy-MM-dd") : "",
										)
									}
								/>
							</PopoverContent>
						</Popover>
					</div>

					{/* ── Footer ── */}
					<DialogFooter>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="w-full sm:w-auto"
						>
							{isSubmitting ? "Adding…" : "Add to Budget"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
