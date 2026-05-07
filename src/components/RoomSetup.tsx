import * as React from "react";
import { PlaneTakeoff, Plus, LogIn, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";

const CURRENCIES = [
	{ code: "USD", label: "USD – US Dollar" },
	{ code: "EUR", label: "EUR – Euro" },
	{ code: "GBP", label: "GBP – British Pound" },
	{ code: "JPY", label: "JPY – Japanese Yen" },
	{ code: "CNY", label: "CNY – Chinese Yuan" },
	{ code: "AUD", label: "AUD – Australian Dollar" },
	{ code: "CAD", label: "CAD – Canadian Dollar" },
	{ code: "KRW", label: "KRW – South Korean Won" },
];

function pushRoomToUrl(roomId: string) {
	const url = new URL(window.location.href);
	url.searchParams.set("room", roomId);
	window.history.pushState({}, "", url.toString());
}

export function RoomSetup() {
	const { state, actions } = useStore();

	// ── Create Room ──────────────────────────────────────────────────────────
	const [roomName, setRoomName] = React.useState("");
	const [currency, setCurrency] = React.useState("USD");
	const [createError, setCreateError] = React.useState<string | null>(null);
	const [isCreating, setIsCreating] = React.useState(false);

	const handleCreate = async (e: React.SubmitEvent) => {
		e.preventDefault();
		setCreateError(null);

		const trimmed = roomName.trim();
		if (!trimmed) {
			setCreateError("Please enter a room name.");
			return;
		}

		setIsCreating(true);
		try {
			await actions.createRoom(trimmed, currency);
		} catch {
			setCreateError("Failed to create room. Please try again.");
		} finally {
			setIsCreating(false);
		}
	};

	// ── Join Room ────────────────────────────────────────────────────────────
	const [roomCode, setRoomCode] = React.useState("");
	const [joinError, setJoinError] = React.useState<string | null>(null);
	const [isJoining, setIsJoining] = React.useState(false);

	const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Only allow alphanumeric, uppercase
		const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
		if (val.length <= 6) setRoomCode(val);
	};

	const handleJoin = async (e: React.SubmitEvent) => {
		e.preventDefault();
		setJoinError(null);

		if (roomCode.length !== 6) {
			setJoinError("Room code must be exactly 6 characters.");
			return;
		}

		setIsJoining(true);
		try {
			const success = await actions.joinRoom(roomCode);
			if (success) {
				pushRoomToUrl(roomCode);
			} else {
				setJoinError("Room not found. Check the code and try again.");
			}
		} catch {
			setJoinError("Failed to join room. Please try again.");
		} finally {
			setIsJoining(false);
		}
	};

	const isBusy = isCreating || isJoining || state.status === "loading";

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
			{/* ── Hero ── */}
			<div className="mb-10 flex flex-col items-center gap-3 text-center">
				<div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
					<PlaneTakeoff className="size-8" />
				</div>
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						BudgetCalc
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Track shared travel expenses
					</p>
				</div>
			</div>

			{/* ── Cards ── */}
			<div className="w-full max-w-md space-y-4">
				{/* Create Room */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Plus className="size-4 text-primary" />
							Create a Room
						</CardTitle>
						<CardDescription>
							Start a new expense group for your trip
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleCreate} className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="room-name">Room name</Label>
								<Input
									id="room-name"
									placeholder="e.g. Tokyo Trip 2025"
									value={roomName}
									onChange={(e) =>
										setRoomName(e.target.value)
									}
									disabled={isBusy}
									autoComplete="off"
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="currency">Currency</Label>
								<Select
									value={currency}
									onValueChange={setCurrency}
									disabled={isBusy}
								>
									<SelectTrigger
										id="currency"
										className="w-full"
									>
										<SelectValue placeholder="Select currency" />
									</SelectTrigger>
									<SelectContent>
										{CURRENCIES.map((c) => (
											<SelectItem
												key={c.code}
												value={c.code}
											>
												{c.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{createError && (
								<div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									<AlertCircle className="size-4 shrink-0" />
									{createError}
								</div>
							)}

							<Button
								type="submit"
								className="w-full"
								disabled={isBusy}
								size="lg"
							>
								{isCreating ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Creating…
									</>
								) : (
									<>
										<Plus className="size-4" />
										Create Room
									</>
								)}
							</Button>
						</form>
					</CardContent>
				</Card>

				{/* Divider */}
				<div className="flex items-center gap-3">
					<div className="h-px flex-1 bg-border" />
					<span className="text-xs text-muted-foreground">or</span>
					<div className="h-px flex-1 bg-border" />
				</div>

				{/* Join Room */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<LogIn className="size-4 text-primary" />
							Join a Room
						</CardTitle>
						<CardDescription>
							Enter a 6-character code shared with you
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleJoin} className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="room-code">Room code</Label>
								<Input
									id="room-code"
									placeholder="ABC123"
									value={roomCode}
									onChange={handleRoomCodeChange}
									disabled={isBusy}
									autoComplete="off"
									className="font-mono tracking-widest uppercase"
									maxLength={6}
								/>
							</div>

							{joinError && (
								<div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									<AlertCircle className="size-4 shrink-0" />
									{joinError}
								</div>
							)}

							<Button
								type="submit"
								variant="outline"
								className="w-full"
								disabled={isBusy || roomCode.length !== 6}
								size="lg"
							>
								{isJoining ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Joining…
									</>
								) : (
									<>
										<LogIn className="size-4" />
										Join Room
									</>
								)}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
