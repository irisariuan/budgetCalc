import {
	PlaneTakeoff,
	Plus,
	HouseHeart,
	AlertCircle,
	Loader2,
	LogIn,
	LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	InputOTPSeparator,
} from "@/components/ui/input-otp";
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
import { useEffect, useState, type SubmitEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { Room } from "@/lib/types";
import { Badge } from "./ui/badge";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";

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
	const [roomName, setRoomName] = useState("");
	const [currency, setCurrency] = useState("USD");
	const [createError, setCreateError] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);

	const handleCreate = async (e: SubmitEvent) => {
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
		} catch (err) {
			setCreateError(
				err instanceof Error
					? err.message
					: "Failed to create room. Please try again.",
			);
		} finally {
			setIsCreating(false);
		}
	};

	// ── Join Room ────────────────────────────────────────────────────────────
	const [roomCode, setRoomCode] = useState("");
	const [joinError, setJoinError] = useState<string | null>(null);
	const [isJoining, setIsJoining] = useState(false);

	const [rooms, setRooms] = useState<{
		items: Room[];
		joinedIds: Set<string>;
	} | null>(null);

	useEffect(() => {
		if (!supabase) return;
		(async () => {
			if (!state.user) return;
			const userId = state.user.id;
			// ── 1. Fetch room IDs the user has joined ─────────────────────
			const { data: joinedData } = await supabase
				.from("room_members")
				.select("room_id")
				.eq("user_id", userId);
			const joinedRoomIds = new Set(
				joinedData?.map((r) => r.room_id) ?? [],
			);

			// ── 2. Fetch joined rooms (RLS allows via member policy) ──────
			const { data: myRooms } = joinedRoomIds.size
				? await supabase
						.from("rooms")
						.select("*")
						.in("id", Array.from(joinedRoomIds))
						.order("created_at", { ascending: false })
				: { data: [] };

			// ── 3. Fetch public rooms (RLS allows via listed policy) ─────
			const { data: publicRooms } = await supabase
				.from("rooms")
				.select("*")
				.eq("listed", true)
				.order("created_at", { ascending: false });

			// ── 4. Merge & deduplicate ───────────────────────────────────
			const merged = new Map<string, Room>();
			// Joined rooms first
			for (const r of myRooms ?? []) {
				merged.set(r.id, {
					createdAt: r.created_at,
					currency: r.currency,
					id: r.id,
					name: r.name,
					listed: r.listed ?? true,
					inviteOnly: r.invite_only ?? false,
					inviteCode: r.invite_code ?? "",
				});
			}
			// Then public rooms (skip if already joined)
			for (const r of publicRooms ?? []) {
				if (!merged.has(r.id)) {
					merged.set(r.id, {
						createdAt: r.created_at,
						currency: r.currency,
						id: r.id,
						name: r.name,
						listed: r.listed ?? true,
						inviteOnly: r.invite_only ?? false,
						inviteCode: r.invite_code ?? "",
					});
				}
			}

			setRooms({
				items: Array.from(merged.values()),
				joinedIds: joinedRoomIds,
			});
		})();
	}, [supabase, state.user]);

	async function joinRoomById(roomId: string) {
		setJoinError(null);

		if (roomId.length !== 6) {
			setJoinError("Room code must be exactly 6 characters.");
			return;
		}

		setIsJoining(true);
		try {
			const result = await actions.joinRoom(roomId);
			if (result === "invite_only") {
				setJoinError(
					"This room is invite-only. Use the invite link instead.",
				);
			} else if (result) {
				pushRoomToUrl(roomId);
			} else {
				setJoinError("Room not found. Check the code and try again.");
			}
		} catch {
			setJoinError("Failed to join room. Please try again.");
		} finally {
			setIsJoining(false);
		}
	}

	const handleJoin = async (e: SubmitEvent) => {
		e.preventDefault();
		await joinRoomById(roomCode);
	};

	const isBusy = isCreating || isJoining || state.status === "loading";

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
			{/* ── Signed-in user bar ── */}
			{/* ── Fixed top-right bar: user info (if signed in) + theme toggle ── */}
			<div className="fixed top-3 right-3 flex items-center gap-2">
				{state.user && (
					<div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 backdrop-blur-md px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
						<span className="max-w-35 truncate">
							{state.user.fullName ?? state.user.email ?? "Guest"}
						</span>
						<button
							onClick={() => actions.signOut()}
							className="flex items-center gap-1 hover:text-foreground transition-colors"
							title="Sign out"
						>
							<LogOut className="size-3" />
							Sign out
						</button>
					</div>
				)}
				<ThemeToggle size="icon" />
			</div>
			{/* ── Hero ── */}
			<div className="mb-10 flex flex-col items-center gap-3 text-center">
				<div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
					<PlaneTakeoff className="size-8" />
				</div>
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						BudgetCalc
					</h1>
					<p className="mt-1 text-muted-foreground">
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
								<div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
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
					<span className="text-sm text-muted-foreground">or</span>
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
								<InputOTP
									id="room-code"
									maxLength={6}
									value={roomCode}
									onChange={(val) =>
										setRoomCode(
											val
												.toUpperCase()
												.replace(/[^A-Z0-9]/g, ""),
										)
									}
									pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
									disabled={isBusy}
								>
									<InputOTPGroup>
										<InputOTPSlot
											index={0}
											className="size-10 text-base font-mono"
										/>
										<InputOTPSlot
											index={1}
											className="size-10 text-base font-mono"
										/>
										<InputOTPSlot
											index={2}
											className="size-10 text-base font-mono"
										/>
									</InputOTPGroup>
									<InputOTPSeparator />
									<InputOTPGroup>
										<InputOTPSlot
											index={3}
											className="size-10 text-base font-mono"
										/>
										<InputOTPSlot
											index={4}
											className="size-10 text-base font-mono"
										/>
										<InputOTPSlot
											index={5}
											className="size-10 text-base font-mono"
										/>
									</InputOTPGroup>
								</InputOTP>
							</div>

							{joinError && (
								<div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
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
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<HouseHeart className="size-4 text-primary" />
							Room List
						</CardTitle>
						<CardDescription>
							Rooms available to join are shown below
						</CardDescription>
						{rooms ? (
							rooms.items.length > 0 ? (
								<ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
									{rooms.items.map((room) => (
										<li
											key={room.id}
											className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent cursor-pointer"
											onClick={() => {
												joinRoomById(room.id);
											}}
										>
											<div className="truncate">
												<span>{room.name}</span>
												{rooms.joinedIds.has(
													room.id,
												) && (
													<Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-200">
														Joined
													</Badge>
												)}
												{room.listed && (
													<Badge
														className="ml-2"
														variant="outline"
													>
														Public
													</Badge>
												)}
											</div>
											<span className="text-muted-foreground">
												{room.currency}
											</span>
										</li>
									))}
								</ul>
							) : (
								<div className="flex items-center gap-2 mt-2 text-muted-foreground">
									<AlertCircle className="size-4 shrink-0" />
									No rooms available.
								</div>
							)
						) : supabase && state.user ? (
							<div className="flex items-center gap-2 mt-2 text-muted-foreground">
								<Loader2 className="size-4 animate-spin" />
								Loading rooms…
							</div>
						) : (
							<div className="flex items-center gap-2 mt-2 text-muted-foreground">
								<AlertCircle className="size-4 shrink-0" />
								You are now offline. Please check your
								connection.
							</div>
						)}
					</CardHeader>
				</Card>
			</div>
		</div>
	);
}
