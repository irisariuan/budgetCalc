// ─── TimeScroller ─────────────────────────────────────────────────────────────
// An iOS-style drum-roll scroll picker column.
//
// Works on both touch (native momentum scroll) and desktop:
//   • Mouse wheel — stops propagation so the parent popover doesn't scroll,
//     then settles to the nearest item.
//   • Pointer drag — click-and-drag up/down to spin the drum.
//   • Click to select — tapping any visible item snaps it to the centre.

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ITEM_H = 40; // px – height of each list item
const VISIBLE = 5; // number of rows visible at once
const DRAG_THRESHOLD = 4; // px – minimum movement before we call it a drag

interface ScrollerColumnProps {
	items: string[];
	value: string;
	onChange: (val: string) => void;
	className?: string;
}

export function ScrollerColumn({
	items,
	value,
	onChange,
	className,
}: ScrollerColumnProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	// Guard: set to true while we are scrolling programmatically so the
	// onScroll settle-timer doesn't re-fire during our own scrollTo().
	const programmaticRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	// ── Drag state ────────────────────────────────────────────────────────────
	const isDragging = useRef(false);
	const dragStartY = useRef(0);
	const dragStartScrollTop = useRef(0);
	const totalMovedY = useRef(0); // total |delta| during this pointer gesture

	// ── Core helpers ──────────────────────────────────────────────────────────

	const scrollToIndex = useCallback((idx: number, smooth = false) => {
		const el = containerRef.current;
		if (!el) return;
		programmaticRef.current = true;
		el.scrollTo({
			top: idx * ITEM_H,
			behavior: smooth ? "smooth" : "instant",
		});
		// Release the guard after the scroll animation can reasonably finish
		setTimeout(() => {
			programmaticRef.current = false;
		}, 300);
	}, []);

	/** Snap the current scroll position to the nearest item and fire onChange. */
	const settle = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		const idx = Math.round(el.scrollTop / ITEM_H);
		const clamped = Math.max(0, Math.min(items.length - 1, idx));
		scrollToIndex(clamped, true);
		if (items[clamped] !== value) onChange(items[clamped]);
	}, [items, value, onChange, scrollToIndex]);

	// Sync when the controlled value changes externally
	useEffect(() => {
		const idx = items.indexOf(value);
		if (idx >= 0) scrollToIndex(idx, false);
	}, [value, items, scrollToIndex]);

	// ── Scroll handler (touch + wheel) ────────────────────────────────────────

	const handleScroll = () => {
		if (programmaticRef.current) return;
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(settle, 80);
	};

	// ── Mouse wheel ───────────────────────────────────────────────────────────
	// Stop propagation so the parent popover/dialog doesn't scroll; then let
	// the browser handle the actual scroll position and settle afterwards.

	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		e.stopPropagation();
		// The browser will update scrollTop natively; we just schedule settle
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(settle, 150);
	};

	// ── Pointer drag (desktop mouse drag) ────────────────────────────────────

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		isDragging.current = true;
		totalMovedY.current = 0;
		dragStartY.current = e.clientY;
		dragStartScrollTop.current = containerRef.current?.scrollTop ?? 0;
		// Capture so pointermove/up fire even if the cursor leaves the element
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDragging.current || !containerRef.current) return;
		const delta = dragStartY.current - e.clientY;
		totalMovedY.current = Math.abs(delta);
		if (totalMovedY.current > DRAG_THRESHOLD) {
			// Suppress the settle-timer while the user is actively dragging
			programmaticRef.current = true;
			containerRef.current.scrollTop = dragStartScrollTop.current + delta;
		}
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDragging.current) return;
		isDragging.current = false;
		programmaticRef.current = false;

		if (totalMovedY.current <= DRAG_THRESHOLD) {
			// ── Click to select ──────────────────────────────────────────────
			// Calculate which item sits under the pointer.
			// Items in the scrollable content start after the top spacer
			// (height = ITEM_H * 2), so:
			//   contentY = (clientY − rect.top + scrollTop) − topSpacer
			//   itemIndex = round(contentY / ITEM_H)
			const el = containerRef.current;
			if (el) {
				const rect = el.getBoundingClientRect();
				const contentY =
					e.clientY - rect.top + el.scrollTop - ITEM_H * 2;
				const idx = Math.round(contentY / ITEM_H);
				const clamped = Math.max(0, Math.min(items.length - 1, idx));
				scrollToIndex(clamped, true);
				if (items[clamped] !== value) onChange(items[clamped]);
			}
		} else {
			// ── Drag ended — settle to nearest item ──────────────────────────
			clearTimeout(timerRef.current);
			timerRef.current = setTimeout(settle, 80);
		}
	};

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div
			className={cn("relative select-none", className)}
			style={{ height: ITEM_H * VISIBLE }}
		>
			{/* Selected-item highlight band */}
			<div
				className="pointer-events-none absolute inset-x-0 rounded-lg bg-muted"
				style={{ top: ITEM_H * 2, height: ITEM_H }}
			/>

			{/* Scrollable list
			     mask-image fades items at top/bottom using alpha only — no colour
			     interpolation issues (unlike a background-gradient overlay). */}
			<div
				ref={containerRef}
				onScroll={handleScroll}
				onWheel={handleWheel}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
				className="scrollbar-hide h-full overflow-y-scroll cursor-grab active:cursor-grabbing"
				style={{
					scrollSnapType: "y mandatory",
					maskImage:
						"linear-gradient(to bottom, transparent 0%, black 28%, black 72%, transparent 100%)",
					WebkitMaskImage:
						"linear-gradient(to bottom, transparent 0%, black 28%, black 72%, transparent 100%)",
				}}
			>
				{/* Top spacer so the first item can be centred */}
				<div style={{ height: ITEM_H * 2 }} />

				{items.map((item) => (
					<div
						key={item}
						className="flex items-center justify-center text-sm font-medium text-foreground"
						style={{ height: ITEM_H, scrollSnapAlign: "center" }}
					>
						{item}
					</div>
				))}

				{/* Bottom spacer so the last item can be centred */}
				<div style={{ height: ITEM_H * 2 }} />
			</div>
		</div>
	);
}
