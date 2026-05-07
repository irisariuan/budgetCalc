import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

function Drawer({
	shouldScaleBackground = true,
	...props
}: ComponentProps<typeof DrawerPrimitive.Root>) {
	return (
		<DrawerPrimitive.Root
			shouldScaleBackground={shouldScaleBackground}
			{...props}
		/>
	);
}

function DrawerTrigger({
	...props
}: ComponentProps<typeof DrawerPrimitive.Trigger>) {
	return <DrawerPrimitive.Trigger {...props} />;
}

function DrawerPortal({
	...props
}: ComponentProps<typeof DrawerPrimitive.Portal>) {
	return <DrawerPrimitive.Portal {...props} />;
}

function DrawerClose({
	...props
}: ComponentProps<typeof DrawerPrimitive.Close>) {
	return <DrawerPrimitive.Close {...props} />;
}

function DrawerOverlay({
	className,
	...props
}: ComponentProps<typeof DrawerPrimitive.Overlay>) {
	return (
		<DrawerPrimitive.Overlay
			className={cn(
				"fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
				className,
			)}
			{...props}
		/>
	);
}

function DrawerContent({
	className,
	children,
	...props
}: ComponentProps<typeof DrawerPrimitive.Content>) {
	return (
		<DrawerPortal>
			<DrawerOverlay />
			<DrawerPrimitive.Content
				className={cn(
					"fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border border-border bg-background shadow-xl outline-none",
					className,
				)}
				{...props}
			>
				<div className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/20" />
				{children}
			</DrawerPrimitive.Content>
		</DrawerPortal>
	);
}

function DrawerHeader({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-col gap-1 px-4 pt-2 pb-0 text-center sm:text-left",
				className,
			)}
			{...props}
		/>
	);
}

function DrawerFooter({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("mt-auto flex flex-col gap-2 p-4", className)}
			{...props}
		/>
	);
}

function DrawerTitle({
	className,
	...props
}: ComponentProps<typeof DrawerPrimitive.Title>) {
	return (
		<DrawerPrimitive.Title
			className={cn(
				"text-base font-semibold leading-none tracking-tight",
				className,
			)}
			{...props}
		/>
	);
}

function DrawerDescription({
	className,
	...props
}: ComponentProps<typeof DrawerPrimitive.Description>) {
	return (
		<DrawerPrimitive.Description
			className={cn("text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	Drawer,
	DrawerPortal,
	DrawerOverlay,
	DrawerTrigger,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerFooter,
	DrawerTitle,
	DrawerDescription,
};
