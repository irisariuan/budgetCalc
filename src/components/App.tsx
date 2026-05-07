import { PlaneTakeoff } from "lucide-react";
import { StoreProvider, useStore } from "@/lib/store";
import { RoomSetup } from "@/components/RoomSetup";
import { ChartsView } from "@/components/ChartsView";
import { UserManagement } from "@/components/UserManagement";
import { ExpenseList } from "@/components/ExpenseList";
import { HotBar } from "@/components/HotBar";
import { Toaster } from "@/components/ui/sonner";

// ─── Inner app (must live inside StoreProvider) ───────────────────────────────

function AppInner() {
	const { state } = useStore();
	const { room } = state;

	// URL param (?room=XXXXXX) auto-join is handled inside StoreProvider's
	// useEffect on mount — no additional logic needed here.

	// ── No room: show setup screen ────────────────────────────────────────────
	if (!room) {
		return <RoomSetup />;
	}

	// ── In a room: show main layout ────────────────────────────────────────────
	return (
		<>
			{/* Main scroll area — padded at the bottom so content clears the HotBar */}
			<div className="flex flex-col min-h-screen pb-20">
				{/* Header */}
				<header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 py-3">
					<div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<PlaneTakeoff className="size-4" />
					</div>
					<div className="flex items-baseline gap-2 min-w-0">
						<span className="font-bold tracking-tight text-foreground">
							BudgetCalc
						</span>
						<span className="text-muted-foreground truncate">
							/ {room.name}
						</span>
					</div>
				</header>

				{/* Content */}
				<main className="flex-1 flex flex-col gap-4 p-3">
					<ChartsView />
					<ExpenseList />
					<UserManagement />
				</main>
			</div>

			{/* Sticky bottom action bar */}
			<HotBar />

			{/* Toast notifications (e.g. undo after delete) */}
			<Toaster position="bottom-center" richColors />
		</>
	);
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function App() {
	return (
		<StoreProvider>
			<AppInner />
		</StoreProvider>
	);
}
