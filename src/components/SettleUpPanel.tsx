import {
	Wallet,
	CheckCircle2,
	ArrowRight,
	Loader2,
	CheckCheck,
} from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Settlement } from "@/lib/chartUtils";

interface SettleUpPanelProps {
	settlements: Settlement[];
	members: { id: string; name: string; color: string }[];
	currency: string;
	onMarkAsPaid: (settlement: Settlement) => void;
}

export default function SettleUpPanel({
	settlements,
	members,
	currency,
	onMarkAsPaid,
}: SettleUpPanelProps) {
	const [processingIdx, setProcessingIdx] = useState<number | null>(
		null,
	);

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
				<span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Settle Up
				</span>
				<Badge variant="outline" className="h-4 px-1.5 text-xs">
					{settlements.length === 0
						? "All clear"
						: `${settlements.length} transaction${settlements.length !== 1 ? "s" : ""}`}
				</Badge>
			</div>

			{settlements.length === 0 ? (
				// ── All settled ──────────────────────────────────────────────
				<div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/30">
					<CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
					<span className="text-emerald-700 dark:text-emerald-300">
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
								className="flex items-center gap-3 px-4 py-3"
							>
								{/* Payer */}
								<div
									className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
									style={{ backgroundColor: payer.color }}
								>
									{payer.name.charAt(0).toUpperCase()}
								</div>
								<div className="flex min-w-0 flex-1 items-center gap-1.5">
									<span className="truncate font-medium">
										{payer.name}
									</span>
									<span className="text-sm text-muted-foreground">
										pays
									</span>
									<span
										className="font-mono text-sm font-semibold"
										style={{ color: payer.color }}
									>
										{fmt(s.amount)}
									</span>
									<span className="text-sm text-muted-foreground">
										to
									</span>
								</div>
								<ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								{/* Receiver */}
								<div
									className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
									style={{ backgroundColor: receiver.color }}
								>
									{receiver.name.charAt(0).toUpperCase()}
								</div>
								<span className="truncate font-medium">
									{receiver.name}
								</span>
								<Button
									variant="ghost"
									size="icon-sm"
									className="ml-auto shrink-0 text-muted-foreground hover:text-emerald-600"
									onClick={() => {
										setProcessingIdx(i);
										onMarkAsPaid(s);
										setProcessingIdx(null);
									}}
									title="Mark as paid"
									aria-label={`Mark ${payer.name} → ${receiver.name} as paid`}
								>
									{processingIdx === i ? (
										<Loader2 className="size-3.5 animate-spin" />
									) : (
										<CheckCheck className="size-3.5" />
									)}
								</Button>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
