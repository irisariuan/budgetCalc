import { Plus, PiggyBank, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { useStore } from "@/lib/store";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { AddBudgetDialog } from "@/components/AddBudgetDialog";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useState } from "react";

// ─── Status dot ───────────────────────────────────────────────────────────────

const statusText = {
	loading: "Syncing changes...",
	synced: "All changes synced",
	offline: "Offline — changes saved locally",
	error: "Sync error — retrying...",
	idle: "Idle",
};

function StatusIndicator({ status }: { status: string }) {
	if (status === "loading") {
		return (
			<Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
		);
	}
	if (status === "synced") {
		return (
			<span className="inline-block size-3 rounded-full shrink-0 bg-green-500" />
		);
	}
	if (status === "offline") {
		return (
			<span className="inline-block size-3 rounded-full shrink-0 bg-neutral-400 animate-pulse" />
		);
	}
	if (status === "error") {
		return (
			<span className="inline-block size-3 rounded-full shrink-0 bg-destructive" />
		);
	}
	// idle / unknown
	return (
		<span className="inline-block size-3 rounded-full shrink-0 bg-muted-foreground/40" />
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HotBar() {
	const { state, actions } = useStore();
	const { room, status } = state;

	const [expenseOpen, setExpenseOpen] = useState(false);
	const [budgetOpen, setBudgetOpen] = useState(false);

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
						<HoverCard>
							<HoverCardTrigger className="flex items-center">
								<StatusIndicator status={status} />
							</HoverCardTrigger>
							<HoverCardContent>
								<p>{statusText[status] || status}</p>
							</HoverCardContent>
						</HoverCard>
						<span className="font-medium truncate leading-none">
							{room.name}
						</span>
						<Badge
							variant="outline"
							className="font-mono shrink-0 tracking-widest"
							onClick={(e) => {
								const range = document.createRange();
								range.selectNodeContents(e.currentTarget);
								const sel = window.getSelection();
								sel?.removeAllRanges();
								sel?.addRange(range);
							}}
						>
							{room.id}
						</Badge>
						<CopyButton
							text={room.id}
							successMessage="Room code copied"
							size="icon-sm"
							ariaLabel="Copy room code"
						/>
					</div>

					{/* ── Action buttons (center-right) ── */}
					<div className="flex items-center gap-1.5 shrink-0">
						<Button
							size="icon-sm"
							variant="outline"
							onClick={() => setBudgetOpen(true)}
							className="lg:px-2 gap-1.5 min-w-fit"
						>
							<PiggyBank className="size-3.5" />
							<span className="hidden lg:inline">Add Budget</span>
						</Button>

						<Button
							size="icon-sm"
							onClick={() => setExpenseOpen(true)}
							className="lg:px-2 gap-1.5 min-w-fit"
						>
							<Plus className="size-3.5" />
							<span className="hidden lg:inline">
								Add Expense
							</span>
						</Button>
					</div>

					{/* ── Leave room (right) ── */}
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => actions.leaveRoom()}
						className="shrink-0 text-muted-foreground hover:text-destructive min-w-fit lg:p-3 gap-2"
						title="Leave room"
					>
						<LogOut className="size-3.5" />
						<span className="hidden lg:inline">Leave room</span>
					</Button>
				</div>
			</div>
		</>
	);
}
