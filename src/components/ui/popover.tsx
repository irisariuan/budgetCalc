import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";

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
	const [node, setNode] = useState<HTMLDivElement | null>(null);

useEffect(() => {
	if (!node) return;

	const updatePosition = () => {
		// 1. Get the actual side from Radix's DOM attribute
		const currentSide = node.getAttribute("data-side") as "top" | "bottom" | "left" | "right";
		
		const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
		const nodeRect = node.getBoundingClientRect();
		
		// 2. Calculate Available Height based on the actual rendered side
		let availableHeight: number;
		if (currentSide === "top") {
			// Space from viewport top to the bottom of the popover
			availableHeight = nodeRect.bottom - 16;
		} else {
			// Space from the top of the popover to viewport bottom
			availableHeight = viewportHeight - nodeRect.top - 16;
		}

		// 3. Calculate Content Height
		const heightRequire = Array.from(node.children).reduce((acc, child) => {
			const childStyle = window.getComputedStyle(child);
			const margins = parseFloat(childStyle.marginTop) + parseFloat(childStyle.marginBottom);
			return acc + (child as HTMLElement).offsetHeight + margins;
		}, 0);

		const diff = heightRequire - availableHeight;

		// 4. Apply the "Shift" using top/bottom
		if (currentSide === "bottom") {
			// If it overflows the bottom, pull it up using a negative top
			node.style.top = diff > 0 ? `-${diff}px` : "0";
			node.style.bottom = "auto";
			node.style.maxHeight = `${availableHeight + (diff > 0 ? diff : 0)}px`;
		} else if (currentSide === "top") {
			// If it overflows the top, push it down using a negative bottom
			node.style.bottom = diff > 0 ? `-${diff}px` : "0";
			node.style.top = "auto";
			node.style.maxHeight = `${availableHeight + (diff > 0 ? diff : 0)}px`;
		}
	};

	// Observe attribute changes (specifically data-side)
	const mutationObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "attributes" && mutation.attributeName === "data-side") {
				updatePosition();
			}
		}
	});

	// Observe content size changes
	const resizeObserver = new ResizeObserver(() => {
		requestAnimationFrame(updatePosition);
	});

	mutationObserver.observe(node, { attributes: true });
	resizeObserver.observe(node);
	window.visualViewport?.addEventListener("resize", updatePosition);
	window.visualViewport?.addEventListener("scroll", updatePosition);

	updatePosition();

	return () => {
		mutationObserver.disconnect();
		resizeObserver.disconnect();
		window.visualViewport?.removeEventListener("resize", updatePosition);
		window.visualViewport?.removeEventListener("scroll", updatePosition);
	};
}, [node]); // Side prop removed from deps because we track data-side now

const measuredRef = useCallback((el: HTMLDivElement | null) => {
	setNode(el);
}, []);



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
