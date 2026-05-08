import { useState } from "react";
import { Link, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

interface InvitePanelProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function InvitePanel({ open, onOpenChange }: InvitePanelProps) {
	const { state } = useStore();
	const { room } = state;
	if (!room) return null;
	const inviteLink = `${window.location.origin}?invite=${room.inviteCode}`;
	const handleShare = async () => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: `Join ${room.name} on BudgetCalc`,
					text: `Hey! Join our ${room.name} trip expense tracker on BudgetCalc.`,
					url: inviteLink,
				});
			} catch {
				// User cancelled or share failed
			}
		} else {
			// Fallback: copy the link
			try {
				await navigator.clipboard.writeText(inviteLink);
				toast("Invite link copied");
			} catch {
				toast("Failed to copy link");
			}
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Users className="size-5" />
						Invite Members
					</DialogTitle>
					<DialogDescription>
						Share this room with your travel companions
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Invite Link */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm flex items-center gap-2">
								<Link className="size-4" />
								Invite Link
							</CardTitle>
							<CardDescription>
								Anyone with this link can join your room
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex gap-2">
								<Input
									value={inviteLink}
									readOnly
									className="font-mono text-xs"
								/>
								<CopyButton
									text={inviteLink}
									successMessage="Invite link copied"
									className="shrink-0"
									ariaLabel="Copy invite link"
								/>
							</div>
						</CardContent>
					</Card>

					{/* Share Button */}
					<Button onClick={handleShare} className="w-full" size="lg">
						<svg
							viewBox="0 0 24 24"
							className="size-4"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
							<polyline points="16 6 12 2 8 6" />
							<line x1="12" y1="2" x2="12" y2="15" />
						</svg>
						Share via...
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
