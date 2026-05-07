import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";

// ─── useMediaQuery ────────────────────────────────────────────────────────────

export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia(query).matches;
	});
	useEffect(() => {
		const media = window.matchMedia(query);
		setMatches(media.matches);
		const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
		media.addEventListener("change", listener);
		return () => media.removeEventListener("change", listener);
	}, [query]);
	return matches;
}

// ─── AutoPopup ────────────────────────────────────────────────────────────────

interface AutoPopupProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Content rendered inside the header bar */
	header: ReactNode;
	children: ReactNode;
}

/**
 * Renders a Dialog on desktop (≥768 px) and a Drawer on mobile.
 * Pass your own close/action controls via `header`; the built-in
 * Dialog close button is suppressed to avoid duplication.
 */
export function AutoPopup({
	open,
	onOpenChange,
	header,
	children,
}: AutoPopupProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className="sm:max-w-lg p-0 gap-0 overflow-hidden"
					showCloseButton={false}
				>
					<DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
						<DialogTitle asChild>
							<div>{header}</div>
						</DialogTitle>
					</DialogHeader>
					<div className="overflow-y-auto max-h-[80vh] mt-2">
						{children}
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent className="max-h-[92svh]">
				<DrawerHeader className="px-4 pt-2 pb-3 border-b border-border">
					<DrawerTitle asChild>
						<div>{header}</div>
					</DrawerTitle>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto mt-2">{children}</div>
			</DrawerContent>
		</Drawer>
	);
}
