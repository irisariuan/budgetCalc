import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, type ComponentProps } from "react";

function Popover({ ...props }: ComponentProps<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
	...props
}: ComponentProps<typeof PopoverPrimitive.Trigger>) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
	className,
	align = "center",
	sideOffset = 4,
	side = "bottom",
	...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
	const measuredRef = useCallback((node: HTMLDivElement | null) => {
		if (node !== null) {
			const updatePosition = () => {
				const viewportHeight =
					window.visualViewport?.height ?? window.innerHeight;
				const nodeRect = node.getBoundingClientRect();
				
				// 1. Calculate Available Height based on side
				let availableHeight: number;
				if (side === "top") {
					// Space from viewport top to the bottom of the popover
					// (minus padding to keep it off the very edge)
					availableHeight = nodeRect.bottom - 16;
				} else {
					// Space from the top of the popover to viewport bottom
					availableHeight = viewportHeight - nodeRect.top - 16;
				}

				node.style.maxHeight = `${availableHeight}px`;

				// 2. Calculate Content Height
				const heightRequire = Array.from(node.children).reduce(
					(acc, child) => {
						const childStyle = getComputedStyle(child);
						const margins =
							parseFloat(childStyle.marginTop) +
							parseFloat(childStyle.marginBottom);
						return (
							acc + child.getBoundingClientRect().height + margins
						);
					},
					0,
				);

				// 3. Adjust position (the "Shift")
				// Only apply the 'bottom' offset logic if we are on the bottom side.
				// If on the top side, Radix usually handles the push-up via its own positioning engine.
				const diff = heightRequire - availableHeight;

				if (side === "bottom") {
					node.style.bottom = diff > 0 ? `${diff}px` : "0";
					node.style.top = "auto"; // Reset top if it was previously set
					node.style.maxHeight = `calc(100vh - ${32}px)`;
				} else if (side === "top") {
					// When above, if we overflow, we actually want to push the element UP
					// but Radix often handles this. If it doesn't, use 'top'
					node.style.top = diff > 0 ? `-${diff}px` : "0";
					node.style.bottom = "auto";
					node.style.maxHeight = "calc(100vh - 32px)";
				} else {
					// original
					node.style.maxHeight =
						"var(--radix-popover-content-available-height)";
				}
			};

			requestAnimationFrame(updatePosition);

			window.visualViewport?.addEventListener("resize", updatePosition);
			window.visualViewport?.addEventListener("scroll", updatePosition);

			return () => {
				window.visualViewport?.removeEventListener(
					"resize",
					updatePosition,
				);
				window.visualViewport?.removeEventListener(
					"scroll",
					updatePosition,
				);
			};
		}
	}, [side]);
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				data-slot="popover-content"
				align={align}
				side={side}
				sideOffset={sideOffset}
				avoidCollisions
				collisionPadding={16}
				ref={measuredRef}
				className={cn(
					"z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
					"max-h-(--radix-popover-content-available-height) overflow-y-auto",
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}

function PopoverAnchor({
	...props
}: ComponentProps<typeof PopoverPrimitive.Anchor>) {
	return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverHeader({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="popover-header"
			className={cn("flex flex-col gap-0.5 text-sm", className)}
			{...props}
		/>
	);
}

function PopoverTitle({ className, ...props }: ComponentProps<"h2">) {
	return (
		<div
			data-slot="popover-title"
			className={cn("font-medium", className)}
			{...props}
		/>
	);
}

function PopoverDescription({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			data-slot="popover-description"
			className={cn("text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
};
