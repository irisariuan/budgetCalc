import { useState } from "react";
import {
	Save,
	Eye,
	EyeOff,
	Users,
	RefreshCw,
	LogOut,
	Trash2,
	Delete,
	UserMinus,
	Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { InvitePanel } from "@/components/InvitePanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MemberDisplay from "./MemberDisplay";

export function RoomSettings() {
	const { state, actions } = useStore();
	const { room, userRole } = state;

	const [name, setName] = useState(room?.name ?? "");
	const [listed, setListed] = useState(room?.listed ?? true);
	const [inviteOnly, setInviteOnly] = useState(room?.inviteOnly ?? false);
	const [inviteCode, setInviteCode] = useState(room?.inviteCode ?? "");
	const [saving, setSaving] = useState(false);
	const [inviteOpen, setInviteOpen] = useState(false);
	if (!room) return null;

	const isDirty =
		name.trim() !== room.name ||
		listed !== (room.listed ?? true) ||
		inviteOnly !== (room.inviteOnly ?? false) ||
		inviteCode !== (room.inviteCode ?? "");

	const handleSave = async () => {
		const trimmed = name.trim();
		if (!trimmed || saving) return;
		setSaving(true);
		await actions.updateRoom({ name: trimmed, listed, inviteOnly });
		toast("Settings saved");
		setSaving(false);
	};

	const handleRegenerate = async () => {
		if (saving) return;
		setSaving(true);
		// Generate a random 8-char alphanumeric code
		const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		let newCode = "";
		for (let i = 0; i < 8; i++) {
			newCode += chars[Math.floor(Math.random() * chars.length)];
		}
		setInviteCode(newCode);
		await actions.updateRoom({ inviteCode: newCode });
		toast("Invite code regenerated");
		setSaving(false);
	};

	return (
		<div className="flex flex-col gap-4">
			{/* ── Room name ──────────────────────────────────────────────────── */}
			<Card>
				<CardHeader>
					<CardTitle>Room Name</CardTitle>
					<CardDescription>
						Change the display name of this room.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-1.5">
						<Label htmlFor="settings-name">Name</Label>
						<Input
							id="settings-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Tokyo Trip 2025"
							maxLength={80}
						/>
					</div>
				</CardContent>
			</Card>

			{/* ── Visibility ─────────────────────────────────────────────────── */}
			<Card>
				<CardHeader>
					<CardTitle>Visibility</CardTitle>
					<CardDescription>
						When enabled, this room appears in the public room list
						on the join screen so others can find and join it by
						name.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<button
						type="button"
						onClick={() => setListed((v) => !v)}
						className={cn(
							"flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors",
							listed
								? "border-primary/40 bg-primary/5"
								: "border-border bg-muted/30",
						)}
					>
						<div className="flex items-center gap-3">
							{listed ? (
								<Eye className="size-5 shrink-0 text-primary" />
							) : (
								<EyeOff className="size-5 shrink-0 text-muted-foreground" />
							)}
							<div>
								<p className="font-medium leading-none">
									Show in room list
								</p>
								<p className="mt-1 text-sm text-muted-foreground">
									{listed
										? "Publicly visible — anyone can find and join"
										: "Hidden — only joinable via room code"}
								</p>
							</div>
						</div>

						{/* Toggle pill */}
						<div
							aria-hidden
							className={cn(
								"relative ml-4 h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
								listed
									? "bg-primary"
									: "bg-muted-foreground/30",
							)}
						>
							<span
								className={cn(
									"absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
									listed ? "translate-x-5" : "translate-x-0",
								)}
							/>
						</div>
					</button>
				</CardContent>
			</Card>

			{/* ── Invite Only ──────────────────────────────────────────────── */}
			<Card>
				<CardHeader>
					<CardTitle>Invite Only</CardTitle>
					<CardDescription>
						When enabled, only users with an invite link can join
						this room.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<button
						type="button"
						onClick={() => setInviteOnly((v) => !v)}
						className={cn(
							"flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors",
							inviteOnly
								? "border-primary/40 bg-primary/5"
								: "border-border bg-muted/30",
						)}
					>
						<div className="flex items-center gap-3">
							{inviteOnly ? (
								<Users className="size-5 shrink-0 text-primary" />
							) : (
								<Users className="size-5 shrink-0 text-muted-foreground" />
							)}
							<div>
								<p className="font-medium leading-none">
									Invite only
								</p>
								<p className="mt-1 text-sm text-muted-foreground">
									{inviteOnly
										? "Only people with an invite link can join"
										: "Anyone can join with the room code"}
								</p>
							</div>
						</div>

						{/* Toggle pill */}
						<div
							aria-hidden
							className={cn(
								"relative ml-4 h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
								inviteOnly
									? "bg-primary"
									: "bg-muted-foreground/30",
							)}
						>
							<span
								className={cn(
									"absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
									inviteOnly
										? "translate-x-5"
										: "translate-x-0",
								)}
							/>
						</div>
					</button>
				</CardContent>
			</Card>

			{/* ── Invite Code ──────────────────────────────────────────────── */}
			<Card>
				<CardHeader>
					<CardTitle>Invite Code</CardTitle>
					<CardDescription>
						Share this code so others can join your room via link.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2">
						<div className="flex-1 rounded-lg border border-border bg-muted/50 px-4 py-3 font-mono text-center text-lg tracking-widest">
							{inviteCode || "—"}
						</div>
						<CopyButton
							text={inviteCode}
							successMessage="Invite code copied"
							ariaLabel="Copy invite code"
							disabled={!inviteCode}
						/>
						<Button
							size="icon"
							variant="outline"
							onClick={handleRegenerate}
							disabled={saving}
							title="Regenerate code"
						>
							<RefreshCw
								className={cn(
									"size-4",
									saving && "animate-spin",
								)}
							/>
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* ── Members ──────────────────────────────────────────────────── */}
			{!room.listed && <MemberDisplay />}

			{/* ── Invite Panel Button ──────────────────────────────────────── */}
			<Button
				variant="outline"
				onClick={() => setInviteOpen(true)}
				className="w-full gap-2"
				size="lg"
				disabled={!inviteCode}
			>
				<Users className="size-4" />
				Invite Members
			</Button>
			{/* ── Quit Room and Delete Room ──────────────────────────────────────────────────────── */}
			<div className="flex gap-2">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="destructive" className="flex-1 gap-2">
							<Delete />
							Quit Room
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Are you absolutely sure?
							</AlertDialogTitle>
							<AlertDialogDescription>
								You may need an invite code to rejoin this room
								later. This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									actions.quitRoom(room.id);
								}}
							>
								Continue
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							variant="destructive"
							className="flex-1 gap-2"
							disabled={userRole !== "admin"}
						>
							<Trash2 className="size-4" />
							Delete Room
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Are you absolutely sure?
							</AlertDialogTitle>
							<AlertDialogDescription>
								This room and all its data will be permanently
								deleted. This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									actions.deleteRoom(room.id);
								}}
							>
								Continue
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			{/* ── Save ───────────────────────────────────────────────────────── */}
			<Button
				onClick={handleSave}
				disabled={!isDirty || saving || !name.trim()}
				className="w-full"
				size="lg"
			>
				<Save className="size-4" />
				{saving ? "Saving…" : "Save Changes"}
			</Button>

			{/* ── Invite Panel ─────────────────────────────────────────────── */}
			<InvitePanel open={inviteOpen} onOpenChange={setInviteOpen} />
		</div>
	);
}
