import { useState } from "react";
import { PlaneTakeoff, LayoutDashboard, Settings, Loader2 } from "lucide-react";
import { StoreProvider, useStore } from "@/lib/store";
import { LoginScreen } from "@/components/LoginScreen";
import { RoomSetup } from "@/components/RoomSetup";
import { RoomSettings } from "@/components/RoomSettings";
import { ChartsView } from "@/components/ChartsView";
import { UserManagement } from "@/components/UserManagement";
import { TransactionList } from "@/components/TransactionList";
import { HotBar } from "@/components/HotBar";
import { UserAvatarButton } from "@/components/UserAvatarButton";
import { UserSettingsPage } from "@/components/UserSettingsPage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { isOnline } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = "home" | "settings" | "user-settings";

// ─── Inner app (must live inside StoreProvider) ───────────────────────────────

function AppInner() {
	const { state, actions } = useStore();
	const { room, user, authLoading } = state;

	const [page, setPage] = useState<Page>("home");

	// ── Auth gate (online only) ───────────────────────────────────────────────
	if (isOnline) {
		if (authLoading) {
			return (
				<div className="min-h-screen flex items-center justify-center">
					<Loader2 className="size-6 animate-spin text-muted-foreground" />
				</div>
			);
		}
		if (!user) {
			return <LoginScreen />;
		}
	}

	// ── No room: show setup screen ────────────────────────────────────────────
	if (!room) {
		return <RoomSetup />;
	}

	// ── In a room: show main layout ────────────────────────────────────────────

	// Derive a display label from the user object.
	const userLabel =
		user?.fullName ?? user?.email ?? (user?.isAnonymous ? "Guest" : null);

	// One-character avatar initial.
	const userInitial = userLabel?.[0]?.toUpperCase() ?? "?";

	return (
		<>
			{/* Main scroll area — padded at the bottom so content clears the HotBar */}
			<div className="flex flex-col min-h-screen pb-20">
				{/* Header / nav bar */}
				<header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 py-3">
					{/* Left: logo + room name */}
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
					</div>

					{/* Right: nav + user */}
					<nav className="flex items-center gap-0.5 shrink-0">
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => setPage("home")}
							title="Dashboard"
							className={cn(
								page === "home" &&
									"bg-accent text-accent-foreground",
							)}
						>
							<LayoutDashboard className="size-4" />
							<span className="sr-only">Dashboard</span>
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => setPage("settings")}
							title="Room Settings"
							className={cn(
								page === "settings" &&
									"bg-accent text-accent-foreground",
							)}
						>
							<Settings className="size-4" />
							<span className="sr-only">Room Settings</span>
						</Button>

						<ThemeToggle />

						{/* User avatar + settings */}
						{user && (
							<UserAvatarButton
								user={user}
								userLabel={userLabel}
								userInitial={userInitial}
								onSignOut={() => actions.signOut()}
								onOpenSettings={() => setPage("user-settings")}
							/>
						)}
					</nav>
				</header>

				{/* Content */}
				<main className="flex-1 flex flex-col gap-4 p-3">
					{page === "home" ? (
						<>
							<ChartsView />
							<TransactionList />
							<UserManagement />
						</>
					) : page === "user-settings" ? (
						<UserSettingsPage onBack={() => setPage("home")} />
					) : (
						<RoomSettings />
					)}
				</main>
			</div>

			{/* Sticky bottom action bar */}
			<HotBar />
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
