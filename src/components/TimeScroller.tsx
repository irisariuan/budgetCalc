// ─── TimeScroller ─────────────────────────────────────────────────────────────
// An iOS-style drum-roll scroll picker column.
//
// Works on both touch (native momentum scroll) and desktop:
//   • Mouse wheel  — reduced sensitivity, stops propagation, settles with a
//                    custom ease-out-cubic animation to the nearest item.
//   • Pointer drag — dampened sensitivity; click-drag to spin the drum.
//   • Click select — tapping any visible item snaps it to the centre.
//   • Keyboard     — ↑ ↓  Home  End  PageUp  PageDown when the column has
//                    focus. Uses tabIndex={0} on a plain <div> so focus is
//                    possible on desktop without ever triggering the virtual
//                    keyboard on mobile (only <input>/<textarea> do that).

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ITEM_H = 40; // px – height of each list item
const VISIBLE = 5; // number of rows visible at once
const DRAG_THRESHOLD = 4; // px – minimum movement before we call it a drag
const WHEEL_SENSITIVITY = 0.35; // fraction of raw deltaY applied to scrollTop
const DRAG_SENSITIVITY = 0.55; // fraction of raw drag delta applied to scrollTop
const SCROLL_DURATION = 300; // ms – max duration of the snap animation
const SETTLE_DELAY = 160; // ms of idle before snapping to nearest item

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

	// true while a programmatic scroll / animation is running — suppresses the
	// settle timer so our own animation doesn't recursively retrigger.
	const programmaticRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const rafRef = useRef<number | undefined>(undefined);

	// ── Drag state ────────────────────────────────────────────────────────────
	const isDragging = useRef(false);
	const dragStartY = useRef(0);
	const dragStartScrollTop = useRef(0);
	const totalMovedY = useRef(0);

	// ── Custom eased scroll animation ─────────────────────────────────────────
	// Using rAF instead of scrollTo({ behavior:'smooth' }) gives us:
	//   • a real ease-out-cubic curve
	//   • full control to interrupt mid-animation (e.g. on new wheel input)
	//   • no conflict with CSS scroll-snap
	const animateScrollTo = useCallback((targetTop: number) => {
		const el = containerRef.current;
		if (!el) return;

		if (rafRef.current) cancelAnimationFrame(rafRef.current);

		const startTop = el.scrollTop;
		const distance = targetTop - startTop;

		if (Math.abs(distance) < 0.5) {
			el.scrollTop = targetTop;
			programmaticRef.current = false;
			return;
		}

		// Scale duration: short snaps feel snappier, long scrolls stay smooth
		const duration = Math.min(
			SCROLL_DURATION,
			80 + Math.abs(distance) * 2.5,
		);
		const startTime = performance.now();
		const ease = (t: number) => 1 - (1 - t) ** 3; // ease-out cubic

		programmaticRef.current = true;

		const step = (now: number) => {
			const progress = Math.min((now - startTime) / duration, 1);
			el.scrollTop = startTop + distance * ease(progress);
			if (progress < 1) {
				rafRef.current = requestAnimationFrame(step);
			} else {
				el.scrollTop = targetTop;
				programmaticRef.current = false;
				rafRef.current = undefined;
			}
		};

		rafRef.current = requestAnimationFrame(step);
	}, []);

	// ── Core helpers ──────────────────────────────────────────────────────────

	const scrollToIndex = useCallback(
		(idx: number, smooth = false) => {
			const el = containerRef.current;
			if (!el) return;
			if (smooth) {
				animateScrollTo(idx * ITEM_H);
			} else {
				if (rafRef.current) cancelAnimationFrame(rafRef.current);
				programmaticRef.current = true;
				el.scrollTop = idx * ITEM_H;
				setTimeout(() => {
					programmaticRef.current = false;
				}, 50);
			}
		},
		[animateScrollTo],
	);

	/** Snap the current scroll position to the nearest item and fire onChange. */
	const settle = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		const idx = Math.round(el.scrollTop / ITEM_H);
		const clamped = Math.max(0, Math.min(items.length - 1, idx));
		animateScrollTo(clamped * ITEM_H);
		if (items[clamped] !== value) onChange(items[clamped]);
	}, [items, value, onChange, animateScrollTo]);

	// Stable ref so the wheel useEffect doesn't need to re-register on every
	// render cycle (items / value changes update the ref, not the listener).
	const settleRef = useRef(settle);
	useEffect(() => {
		settleRef.current = settle;
	}, [settle]);

	// Sync when the controlled value changes externally
	useEffect(() => {
		const idx = items.indexOf(value);
		if (idx >= 0) scrollToIndex(idx, false);
	}, [value, items, scrollToIndex]);

	// ── Non-passive wheel listener ────────────────────────────────────────────
	// Must be non-passive to call preventDefault() (blocks parent from scrolling)
	// and to apply our own sensitivity damping rather than native scroll speed.
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			e.stopPropagation();

			// Interrupt any in-progress snap animation so the drum feels responsive
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = undefined;
				programmaticRef.current = false;
			}

			el.scrollTop += e.deltaY * WHEEL_SENSITIVITY;

			clearTimeout(timerRef.current);
			timerRef.current = setTimeout(
				() => settleRef.current(),
				SETTLE_DELAY,
			);
		};

		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, []); // empty — settleRef keeps settle current without re-registering

	// ── Native scroll (touch momentum) ───────────────────────────────────────

	const handleScroll = () => {
		if (programmaticRef.current) return;
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => settleRef.current(), SETTLE_DELAY);
	};

	// ── Keyboard ──────────────────────────────────────────────────────────────
	// A plain <div tabIndex={0}> receives key events on desktop after click/tab
	// focus WITHOUT ever triggering the virtual keyboard on iOS or Android
	// (only <input>, <textarea>, <select>, and contenteditable do that).

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const el = containerRef.current;
		if (!el) return;

		const cur = Math.round(el.scrollTop / ITEM_H);

		const go = (idx: number) => {
			e.preventDefault();
			const c = Math.max(0, Math.min(items.length - 1, idx));
			scrollToIndex(c, true);
			if (items[c] !== value) onChange(items[c]);
		};

		switch (e.key) {
			case "ArrowDown":
			case "ArrowRight":
				return go(cur + 1);
			case "ArrowUp":
			case "ArrowLeft":
				return go(cur - 1);
			case "PageDown":
				return go(cur + 5);
			case "PageUp":
				return go(cur - 5);
			case "Home":
				return go(0);
			case "End":
				return go(items.length - 1);
		}
	};

	// ── Pointer drag (desktop mouse drag) ────────────────────────────────────

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		isDragging.current = true;
		totalMovedY.current = 0;
		dragStartY.current = e.clientY;
		dragStartScrollTop.current = containerRef.current?.scrollTop ?? 0;
		// Interrupt any ongoing snap animation so the drum reacts immediately
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		// Capture so pointermove/up fire even if cursor leaves the element
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDragging.current || !containerRef.current) return;
		const rawDelta = dragStartY.current - e.clientY;
		totalMovedY.current = Math.abs(rawDelta);
		if (totalMovedY.current > DRAG_THRESHOLD) {
			programmaticRef.current = true;
			// Apply sensitivity multiplier so the drum doesn't fly past items
			containerRef.current.scrollTop =
				dragStartScrollTop.current + rawDelta * DRAG_SENSITIVITY;
		}
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDragging.current) return;
		isDragging.current = false;
		programmaticRef.current = false;

		if (totalMovedY.current <= DRAG_THRESHOLD) {
			// ── Click to select ──────────────────────────────────────────────
			// Items in the scrollable content start after the top spacer
			// (height = ITEM_H * 2), so:
			//   contentY  = (clientY − rect.top + scrollTop) − topSpacer
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
			timerRef.current = setTimeout(
				() => settleRef.current(),
				SETTLE_DELAY,
			);
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
			     interpolation issues (unlike a background-gradient overlay).
			     tabIndex={0} makes this keyboard-focusable on desktop while
			     never popping up a virtual keyboard on mobile. */}
			<div
				ref={containerRef}
				tabIndex={0}
				onScroll={handleScroll}
				onKeyDown={handleKeyDown}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
				className="scrollbar-hide h-full overflow-y-scroll cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
				style={{
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
						style={{ height: ITEM_H }}
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
