import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePagination<T>(items: T[], pageSize: number) {
	const [page, setPage] = useState(1);

	const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

	// Clamp to a valid page when items are removed
	useEffect(() => {
		if (page > totalPages) setPage(totalPages);
	}, [page, totalPages]);

	const clampedPage = Math.min(page, totalPages);
	const start = (clampedPage - 1) * pageSize;
	const paged = items.slice(start, start + pageSize);

	return {
		page: clampedPage,
		setPage,
		totalPages,
		totalItems: items.length,
		paged,
		pageSize,
		/** 0-based index of the first visible item */
		start,
	};
}

// ─── Page range helper ────────────────────────────────────────────────────────

function getPageRange(current: number, total: number): (number | "…")[] {
	if (total <= 7) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}

	const nums = new Set(
		[1, total, current - 1, current, current + 1].filter(
			(p) => p >= 1 && p <= total,
		),
	);
	const sorted = Array.from(nums).sort((a, b) => a - b);

	const result: (number | "…")[] = [];
	for (let i = 0; i < sorted.length; i++) {
		if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
		result.push(sorted[i]);
	}
	return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PaginatorProps {
	page: number;
	totalPages: number;
	totalItems: number;
	pageSize: number;
	onPageChange: (page: number) => void;
}

export function Paginator({
	page,
	totalPages,
	totalItems,
	pageSize,
	onPageChange,
}: PaginatorProps) {
	const start = (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, totalItems);
	const range = getPageRange(page, totalPages);

	return (
		<div className="flex items-center justify-between gap-2 w-full">
			{/* Item range label */}
			<span className="text-xs text-muted-foreground tabular-nums shrink-0">
				{start}–{end} of {totalItems}
			</span>

			{/* Navigation */}
			<div className="flex items-center gap-0.5">
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={() => onPageChange(page - 1)}
					disabled={page === 1}
					aria-label="Previous page"
				>
					<ChevronLeft />
				</Button>

				{range.map((entry, i) =>
					entry === "…" ? (
						<span
							key={`ellipsis-${i}`}
							className="w-5 text-center text-xs text-muted-foreground select-none"
						>
							…
						</span>
					) : (
						<Button
							key={entry}
							variant={entry === page ? "default" : "ghost"}
							size="icon-xs"
							onClick={() => onPageChange(entry)}
							aria-label={`Page ${entry}`}
							aria-current={entry === page ? "page" : undefined}
						>
							{entry}
						</Button>
					),
				)}

				<Button
					variant="ghost"
					size="icon-xs"
					onClick={() => onPageChange(page + 1)}
					disabled={page === totalPages}
					aria-label="Next page"
				>
					<ChevronRight />
				</Button>
			</div>
		</div>
	);
}
