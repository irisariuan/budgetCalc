// ── Adjust Balance Row ────────────────────────────────────────────────────
import {
	Check,
	BadgeDollarSign,
} from "lucide-react";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { MemberSelect } from "./MemberSelect";
import { DateTimePickerButton } from "./DateTimePicker";

export default function AdjustUserBalance() {
	const { actions, state } = useStore();
	const { members } = state;
	const [memberId, setMemberId] = useState("");
	const member = members.find((m) => m.id === memberId);
	const currency = state.room?.currency;
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isBusy, setIsBusy] = useState(false);

	const [sign, setSign] = useState<"+" | "-">("+");
	const [amountStr, setAmountStr] = useState("");
	const [description, setDescription] = useState("");
	const [date, setDate] = useState(new Date().toISOString());

	const handleSubmit = (e: SubmitEvent) => {
		e.preventDefault();
		const num = parseFloat(amountStr);
		if (!num || num <= 0) return;
		const finalAmount = sign === "+" ? num : -num;
		setIsBusy(true);
		actions
			.addBalanceAdjustment({
				memberId,
				amount: finalAmount,
				description,
				date,
			})
			.then(() => {
				setIsBusy(false);
				setMemberId("");
			});
	};

	const amountNum = parseFloat(amountStr) || 0;

	if (!state.room) return <></>;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<BadgeDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
				<span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Change
				</span>
			</div>
			<div className="space-y-1.5">
				<MemberSelect
					members={members}
					value={memberId}
					onValueChange={(val) => {
						setMemberId(val);
						if (errors.change)
							setErrors((p) => ({
								...p,
								change: "",
							}));
					}}
				/>
				{errors.change && (
					<p className="text-sm text-destructive">{errors.change}</p>
				)}
			</div>
			{member && (
				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3"
				>
					<>
						{/* Amount with +/- toggle */}
						<div className="flex gap-2">
							<div className="grid grid-cols-2 h-9 w-20 rounded-lg border border-input overflow-hidden shrink-0">
								<button
									type="button"
									onClick={() => setSign("+")}
									className={`font-bold transition-colors ${sign === "+" ? "bg-emerald-500 text-white" : "bg-transparent text-muted-foreground hover:bg-muted/60"}`}
								>
									+
								</button>
								<button
									type="button"
									onClick={() => setSign("-")}
									className={`font-bold border-l border-input transition-colors ${sign === "-" ? "bg-destructive text-white" : "bg-transparent text-muted-foreground hover:bg-muted/60"}`}
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
								onChange={(e) => setAmountStr(e.target.value)}
								disabled={isBusy}
								className="flex-1"
							/>
						</div>

						{/* Description */}
						<Input
							placeholder="Reason (e.g. Cash already paid)"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							disabled={isBusy}
						/>

						{/* Date */}
						<DateTimePickerButton date={date} setDate={setDate} />

						{/* Preview */}
						{amountNum > 0 && (
							<p className="text-sm text-muted-foreground px-0.5">
								{member.name}'s balance will{" "}
								{sign === "+" ? (
									<span className="font-semibold text-emerald-600">
										increase by{" "}
										{new Intl.NumberFormat("en-US", {
											style: "currency",
											currency,
										}).format(amountNum)}
									</span>
								) : (
									<span className="font-semibold text-destructive">
										decrease by{" "}
										{new Intl.NumberFormat("en-US", {
											style: "currency",
											currency,
										}).format(amountNum)}
									</span>
								)}
							</p>
						)}

						<div className="flex justify-end gap-2">
							<Button
								type="submit"
								disabled={
									isBusy ||
									!amountStr ||
									parseFloat(amountStr) <= 0
								}
							>
								<Check className="size-4" />
								Apply
							</Button>
						</div>
					</>
				</form>
			)}
		</div>
	);
}
