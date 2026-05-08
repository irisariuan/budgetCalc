import { useState } from "react";
import { Link, Copy, Check, Users } from "lucide-react";
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

	const [copied, setCopied] = useState(false);
	const [inviteName, setInviteName] = useState("");
	const [sending, setSending] = useState(false);

	if (!room) return null;

	const inviteLink = `${window.location.origin}?invite=${room.inviteCode}`;

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(inviteLink);
			setCopied(true);
			toast("Invite link copied");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast("Failed to copy link");
		}
	};

	const handleSendInvite = async () => {
		const trimmed = inviteName.trim();
		if (!trimmed || sending) return;

		setSending(true);
		try {
			const message = trimmed
				? `Hey ${trimmed}! Join our ${room.name} trip expense tracker on BudgetCalc: ${inviteLink}`
				: `Join our ${room.name} trip expense tracker on BudgetCalc: ${inviteLink}`;
			await navigator.clipboard.writeText(message);
			toast("Invite message copied to clipboard");
			setInviteName("");
		} catch {
			toast("Failed to copy invite message");
		} finally {
			setSending(false);
		}
	};

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
			await handleCopyLink();
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
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
								<Button
									size="icon"
									variant="outline"
									onClick={handleCopyLink}
									className="shrink-0"
								>
									{copied ? (
										<Check className="size-4 text-green-500" />
									) : (
										<Copy className="size-4" />
									)}
								</Button>
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
