import { LogOut, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { AuthUser } from "@/lib/types";

interface UserAvatarButtonProps {
	user: AuthUser;
	userLabel: string | null;
	userInitial: string;
	onSignOut: () => void;
	onOpenSettings: () => void;
}

export function UserAvatarButton({
	user,
	userLabel,
	userInitial,
	onSignOut,
	onOpenSettings,
}: UserAvatarButtonProps) {
	return (
		<HoverCard>
			<HoverCardTrigger asChild>
				<button
					className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold ring-1 ring-primary/20 hover:bg-primary/20 transition-colors"
					title={userLabel ?? "User"}
				>
					{user.avatarUrl ? (
						<img
							src={user.avatarUrl}
							alt={userLabel ?? "User"}
							className="size-7 rounded-full object-cover"
						/>
					) : (
						userInitial
					)}
				</button>
			</HoverCardTrigger>
			<HoverCardContent align="end" className="w-56 p-3">
				<div className="mb-3">
					<p className="text-sm font-medium leading-none">
						{userLabel ?? "Guest"}
					</p>
					{user.email && (
						<p className="mt-1 text-xs text-muted-foreground truncate">
							{user.email}
						</p>
					)}
					{user.isAnonymous && (
						<p className="mt-1 text-xs text-muted-foreground">
							Anonymous session
						</p>
					)}
				</div>
				<div className="flex flex-col gap-1.5">
					<Button
						variant="outline"
						size="sm"
						className="w-full gap-2"
						onClick={onOpenSettings}
					>
						<UserCog className="size-3.5" />
						Profile Settings
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="w-full gap-2"
						onClick={onSignOut}
					>
						<LogOut className="size-3.5" />
						Sign out
					</Button>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}
