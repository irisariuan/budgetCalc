import * as React from "react";
import { Plus, PiggyBank, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { AddBudgetDialog } from "@/components/AddBudgetDialog";

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusIndicator({ status }: { status: string }) {
	if (status === "loading") {
		return (
			<Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
		);
	}
	if (status === "synced") {
		return (
			<span
				className="inline-block size-2 rounded-full shrink-0 bg-green-500"
				title="Synced"
			/>
		);
	}
	if (status === "offline") {
		return (
			<span
				className="inline-block size-2 rounded-full shrink-0 bg-orange-400"
				title="Offline — changes saved locally"
			/>
		);
	}
	if (status === "error") {
		return (
			<span
				className="inline-block size-2 rounded-full shrink-0 bg-destructive"
				title="Sync error"
			/>
		);
	}
	// idle / unknown
	return (
		<span className="inline-block size-2 rounded-full shrink-0 bg-muted-foreground/40" />
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HotBar() {
	const { state, actions } = useStore();
	const { room, status } = state;

	const [expenseOpen, setExpenseOpen] = React.useState(false);
	const [budgetOpen, setBudgetOpen] = React.useState(false);

	// Don't render if no active room
	if (!room) return null;

	return (
		<>
			{/* ── Dialogs ── */}
			<AddExpenseDialog
				open={expenseOpen}
				onOpenChange={setExpenseOpen}
			/>
			<AddBudgetDialog open={budgetOpen} onOpenChange={setBudgetOpen} />

			{/* ── Sticky bottom bar ── */}
			<div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur-md">
				<div className="flex items-center gap-2 px-3 py-2.5 max-w-3xl mx-auto">
					{/* ── Room info (left) ── */}
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<StatusIndicator status={status} />
						<span className="text-sm font-medium truncate leading-none">
							{room.name}
						</span>
						<Badge
							variant="outline"
							className="font-mono text-[0.7rem] shrink-0 tracking-widest"
						>
							{room.id}
						</Badge>
					</div>

					{/* ── Action buttons (center-right) ── */}
					<div className="flex items-center gap-1.5 shrink-0">
						<Button
							size="sm"
							variant="outline"
							onClick={() => setBudgetOpen(true)}
							className="gap-1.5"
						>
							<PiggyBank className="size-3.5" />
							<span className="hidden xs:inline">Add Budget</span>
						</Button>

						<Button
							size="sm"
							onClick={() => setExpenseOpen(true)}
							className="gap-1.5"
						>
							<Plus className="size-3.5" />
							<span className="hidden xs:inline">
								Add Expense
							</span>
						</Button>
					</div>

					{/* ── Leave room (right) ── */}
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => actions.leaveRoom()}
						className="shrink-0 text-muted-foreground hover:text-destructive"
						title="Leave room"
					>
						<LogOut className="size-4" />
						<span className="sr-only">Leave room</span>
					</Button>
				</div>
			</div>
		</>
	);
}
