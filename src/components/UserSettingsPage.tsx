import { useState } from "react";
import { ArrowLeft, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

interface UserSettingsPageProps {
	onBack: () => void;
}

export function UserSettingsPage({ onBack }: UserSettingsPageProps) {
	const { state, actions } = useStore();
	const { user, roomParticipants } = state;

	// Find the current user's display name from room_members
	const currentParticipant = roomParticipants.find(
		(p) => p.userId === user?.id,
	);
	const currentNickname =
		currentParticipant?.displayName ??
		user?.fullName ??
		user?.email ??
		"";

	const [nickname, setNickname] = useState(currentNickname);
	const [saving, setSaving] = useState(false);

	if (!user) return null;

	const userLabel =
		user.fullName ?? user.email ?? (user.isAnonymous ? "Guest" : null);
	const userInitial = userLabel?.[0]?.toUpperCase() ?? "?";
	const isDirty = nickname.trim() !== currentNickname;

	const handleSave = async () => {
		const trimmed = nickname.trim();
		if (!trimmed || saving || !isDirty) return;
		setSaving(true);
		await actions.updateNickname(trimmed);
		toast("Nickname updated");
		setSaving(false);
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Back button */}
			<Button
				variant="ghost"
				size="sm"
				className="self-start gap-1.5 -ml-1"
				onClick={onBack}
			>
				<ArrowLeft className="size-4" />
				Back
			</Button>

			{/* Avatar / identity card */}
			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>
						Your account information from your sign-in provider.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-4">
						{/* Avatar */}
						<div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold ring-2 ring-primary/20">
							{user.avatarUrl ? (
								<img
									src={user.avatarUrl}
									alt={userLabel ?? "User"}
									className="size-14 rounded-full object-cover"
								/>
							) : (
								<UserRound className="size-7" />
							)}
						</div>

						{/* Info */}
						<div className="min-w-0">
							<p className="font-semibold leading-none truncate">
								{userLabel ?? "Guest"}
							</p>
							{user.email && (
								<p className="mt-1 text-sm text-muted-foreground truncate">
									{user.email}
								</p>
							)}
							{user.isAnonymous && (
								<p className="mt-1 text-sm text-muted-foreground">
									Anonymous session
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Nickname card */}
			<Card>
				<CardHeader>
					<CardTitle>Nickname</CardTitle>
					<CardDescription>
						This name is shown to other members in every room you
						belong to.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="user-nickname">Display name</Label>
						<Input
							id="user-nickname"
							value={nickname}
							onChange={(e) => setNickname(e.target.value)}
							placeholder="e.g. Alice"
							maxLength={60}
						/>
					</div>

					<Button
						onClick={handleSave}
						disabled={!isDirty || saving || !nickname.trim()}
						className="w-full"
						size="lg"
					>
						<Save className="size-4" />
						{saving ? "Saving…" : "Save Nickname"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
