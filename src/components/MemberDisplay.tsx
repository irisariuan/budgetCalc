import { useStore } from "@/lib/store";
import { MEMBER_COLORS } from "@/lib/types";
import { actions } from "astro:actions";
import { Users, Crown, UserMinus } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from "./ui/alert-dialog";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from "./ui/card";

export default function MemberDisplay() {
	const { state } = useStore();
	const { roomParticipants, user, userRole } = state;
	const [kickingMemberId, setKickingMemberId] = useState<string | null>(null);
	const currentUserId = user?.id;
	/** Deterministic color derived from userId so it stays stable across re-renders. */
	function participantColor(userId: string): string {
		let hash = 0;
		for (let i = 0; i < userId.length; i++) {
			hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
		}
		return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
	}
	const isAdmin = userRole === "admin";

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="size-5" />
					Members ({roomParticipants.length})
				</CardTitle>
				<CardDescription>
					{isAdmin
						? "Manage room members. Only admins can remove members."
						: "Users in this room."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{roomParticipants.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No members yet.
					</p>
				) : (
					<div className="space-y-2">
						{roomParticipants.map((participant) => {
							const isCurrentUser =
								participant.userId === currentUserId;
							const isMemberAdmin = participant.role === "admin";
							const canKick = isAdmin && !isCurrentUser;
							const name = participant.displayName;
							const color = participantColor(participant.userId);

							return (
								<div
									key={participant.userId}
									className="flex items-center justify-between rounded-lg border p-3"
								>
									<div className="flex items-center gap-3">
										<div
											className="size-4 rounded-full"
											style={{
												backgroundColor: color,
											}}
											aria-hidden
										/>
										<div>
											<p className="font-medium">
												{name}
												{isCurrentUser && " (You)"}
											</p>
											{isMemberAdmin && (
												<div className="flex items-center gap-1 text-xs text-amber-600">
													<Crown className="size-3" />
													Admin
												</div>
											)}
										</div>
									</div>
									{canKick && (
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														setKickingMemberId(
															participant.userId,
														)
													}
													className="gap-1 text-destructive hover:text-destructive"
												>
													<UserMinus className="size-4" />
													Kick
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Kick {name}?
													</AlertDialogTitle>
													<AlertDialogDescription>
														This will remove {name}{" "}
														from the room. They may
														need an invite code to
														rejoin.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>
														Cancel
													</AlertDialogCancel>
													<AlertDialogAction
														onClick={async () => {
															await actions.kickParticipant(
																participant.userId,
															);
															setKickingMemberId(
																null,
															);
															toast(
																`${name} has been removed`,
															);
														}}
														className="bg-destructive text-white hover:bg-destructive/90"
													>
														Kick
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									)}
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
