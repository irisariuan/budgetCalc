import { useState } from "react";
import { Save, Eye, EyeOff } from "lucide-react";
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
import { cn } from "@/lib/utils";

export function RoomSettings() {
	const { state, actions } = useStore();
	const { room } = state;

	const [name, setName] = useState(room?.name ?? "");
	const [listed, setListed] = useState(room?.listed ?? true);
	const [saving, setSaving] = useState(false);

	if (!room) return null;

	const isDirty =
		name.trim() !== room.name || listed !== (room.listed ?? true);

	const handleSave = async () => {
		const trimmed = name.trim();
		if (!trimmed || saving) return;
		setSaving(true);
		await actions.updateRoom({ name: trimmed, listed });
		toast("Settings saved");
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
		</div>
	);
}
