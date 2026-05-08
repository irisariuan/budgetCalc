// ─── Photo Carousel ───────────────────────────────────────────────────────────
// PhotoCarouselLightbox – full-screen overlay with Carousel navigation
// ReceiptGallery        – clickable thumbnail grid that opens the lightbox

import { useEffect, useRef, useState } from "react";
import {
	X,
	Square,
	Maximize2,
	ImageIcon,
	ImagePlus,
	ExternalLink,
	Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselPrevious,
	CarouselNext,
	type CarouselApi,
} from "@/components/ui/carousel";

export type AspectRatio = "square" | "natural";

// ─── PhotoCarouselLightbox ────────────────────────────────────────────────────

export interface PhotoCarouselLightboxProps {
	/** Array of images to display. */
	images: { url: string; alt: string }[];
	/** Index of the slide to show on open (default 0). */
	initialIndex?: number;
	/** Whether the lightbox is visible. */
	open: boolean;
	/** Called when the user closes the lightbox. */
	onClose: () => void;
	/**
	 * Initial display mode.
	 * - "natural" – images respect their original aspect ratio (default)
	 * - "square"  – images are cropped / padded to a square
	 */
	defaultAspectRatio?: AspectRatio;
}

export function PhotoCarouselLightbox({
	images,
	initialIndex = 0,
	open,
	onClose,
	defaultAspectRatio = "natural",
}: PhotoCarouselLightboxProps) {
	const [api, setApi] = useState<CarouselApi>();
	const [current, setCurrent] = useState(initialIndex);
	const [aspectRatio, setAspectRatio] =
		useState<AspectRatio>(defaultAspectRatio);
	const [downloading, setDownloading] = useState(false);

	async function handleDownload(e: React.MouseEvent) {
		e.stopPropagation();
		const image = images[current];
		if (!image || downloading) return;
		setDownloading(true);
		try {
			const res = await fetch(image.url);
			const blob = await res.blob();
			const blobUrl = URL.createObjectURL(blob);
			const ext = blob.type.split("/")[1]?.split("+")[0] ?? "jpg";
			const filename = `${image.alt.replace(/\s+/g, "_")}.${ext}`;
			const a = document.createElement("a");
			a.href = blobUrl;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(blobUrl);
		} catch {
			// Cross-origin fetch blocked — fall back to opening in a new tab
			window.open(image.url, "_blank", "noopener,noreferrer");
		} finally {
			setDownloading(false);
		}
	}

	// Jump to the correct slide every time the lightbox opens
	useEffect(() => {
		if (!api || !open) return;
		api.scrollTo(initialIndex, true);
		setCurrent(initialIndex);
	}, [api, open, initialIndex]);

	// Track which slide is active
	useEffect(() => {
		if (!api) return;
		const onSelect = () => setCurrent(api.selectedScrollSnap());
		api.on("select", onSelect);
		onSelect();
		return () => {
			api.off("select", onSelect);
		};
	}, [api]);

	// ESC key to close
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open, onClose]);

	if (!open || images.length === 0) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
			onClick={onClose}
		>
			{/* ── Top bar ─────────────────────────────────────────────────────── */}
			<div className="absolute inset-x-0 top-4 z-10 flex items-center justify-between px-4">
				{/* Aspect-ratio toggle */}
				<button
					type="button"
					className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
					onClick={(e) => {
						e.stopPropagation();
						setAspectRatio((r) =>
							r === "square" ? "natural" : "square",
						);
					}}
					aria-label={`Switch to ${aspectRatio === "square" ? "natural" : "square"} aspect ratio`}
				>
					{aspectRatio === "square" ? (
						<Maximize2 className="size-3.5" />
					) : (
						<Square className="size-3.5" />
					)}
					{aspectRatio === "square" ? "Natural" : "Square"}
				</button>

				{/* Slide counter */}
				{images.length > 1 && (
					<span className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
						{current + 1} / {images.length}
					</span>
				)}

				{/* Right-side action group */}
				<div className="flex items-center gap-2">
					{/* Open in new tab */}
					<a
						href={images[current]?.url}
						target="_blank"
						rel="noopener noreferrer"
						className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
						onClick={(e) => e.stopPropagation()}
						aria-label="Open in new tab"
					>
						<ExternalLink className="size-4" />
					</a>

					{/* Download */}
					<button
						type="button"
						className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
						onClick={handleDownload}
						disabled={downloading}
						aria-label="Download image"
					>
						<Download className="size-4" />
					</button>

					{/* Close */}
					<button
						type="button"
						className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
						onClick={(e) => {
							e.stopPropagation();
							onClose();
						}}
						aria-label="Close"
					>
						<X className="size-5" />
					</button>
				</div>
			</div>

			{/* ── Carousel ────────────────────────────────────────────────────── */}
			<div
				className="w-full max-w-3xl px-14"
				onClick={(e) => e.stopPropagation()}
			>
				<Carousel setApi={setApi} opts={{ startIndex: initialIndex }}>
					<CarouselContent>
						{images.map(({ url, alt }, i) => (
							<CarouselItem key={i}>
								<div
									className={cn(
										"flex items-center justify-center",
										aspectRatio === "square"
											? "aspect-square"
											: "h-[76vh]",
									)}
								>
									<img
										src={url}
										alt={alt}
										className={cn(
											"rounded-xl shadow-2xl",
											aspectRatio === "square"
												? "h-full w-full object-cover"
												: "max-h-full max-w-full object-contain",
										)}
									/>
								</div>
							</CarouselItem>
						))}
					</CarouselContent>

					{images.length > 1 && (
						<>
							<CarouselPrevious className="-left-10 border-white/20 bg-black/40 text-white hover:bg-black/60 hover:text-white disabled:opacity-30" />
							<CarouselNext className="-right-10 border-white/20 bg-black/40 text-white hover:bg-black/60 hover:text-white disabled:opacity-30" />
						</>
					)}
				</Carousel>
			</div>

			{/* ── Caption ─────────────────────────────────────────────────────── */}
			<p className="absolute bottom-5 left-1/2 max-w-xs -translate-x-1/2 truncate text-center text-xs text-white/40">
				{images[current]?.alt}
			</p>
		</div>
	);
}

// ─── ReceiptGallery ───────────────────────────────────────────────────────────

export interface ReceiptGalleryProps {
	/** Receipt image URLs. */
	urls: string[];
	/** Optional alt texts, indexed to match `urls`. */
	alts?: string[];
	/**
	 * Short labels shown as a bottom-left overlay on each thumbnail.
	 * Only rendered when the gallery is in edit mode (onRemove / onReplace).
	 */
	labels?: string[];
	/**
	 * Initial display mode for the lightbox.
	 * - "natural" – respects original aspect ratio (default)
	 * - "square"  – crops to square
	 */
	defaultAspectRatio?: AspectRatio;
	/** Extra class names forwarded to the thumbnail grid wrapper. */
	className?: string;
	/**
	 * Extra class names applied to every thumbnail container (e.g. `"h-32"`).
	 * When a height is provided the image fills the container via `object-cover`.
	 */
	thumbnailClassName?: string;
	// ── Edit-mode props ─────────────────────────────────────────────────────
	/** When provided, a Remove button overlay is shown on each thumbnail. */
	onRemove?: (index: number) => void;
	/**
	 * When provided, a Replace button overlay is shown and a hidden file input
	 * is wired up per thumbnail.
	 */
	onReplace?: (file: File, index: number) => void;
	/** MIME types accepted by the Replace file picker. */
	acceptedTypes?: string[];
}

export function ReceiptGallery({
	urls,
	alts,
	labels,
	defaultAspectRatio = "natural",
	className,
	thumbnailClassName,
	onRemove,
	onReplace,
	acceptedTypes,
}: ReceiptGalleryProps) {
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	// Per-item refs for the hidden Replace file inputs (only used in edit mode)
	const replaceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

	const images = urls.map((url, i) => ({
		url,
		alt: alts?.[i] ?? `Receipt ${i + 1}`,
	}));

	function openAt(index: number) {
		setActiveIndex(index);
		setLightboxOpen(true);
	}

	return (
		<>
			{/* ── Thumbnail grid ──────────────────────────────────────────────── */}
			<div
				className={cn(
					"grid gap-2",
					urls.length === 1 ? "grid-cols-1" : "grid-cols-2",
					className,
				)}
			>
				{images.map(({ url, alt }, i) => (
					// Container is the size anchor; overlays are positioned inside it.
					<div
						key={url}
						className={cn(
							"group relative overflow-hidden rounded-xl border border-border transition-colors hover:border-primary/50",
							thumbnailClassName,
						)}
					>
						{/* ── Lightbox trigger (fills the container) ─────────── */}
						<button
							type="button"
							onClick={() => openAt(i)}
							className={cn(
								"relative block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
								thumbnailClassName && "h-full",
							)}
							aria-label={`View ${alt}`}
						>
							<img
								src={url}
								alt={alt}
								className={cn(
									"block w-full object-cover",
									thumbnailClassName && "h-full",
								)}
								onError={(e) => {
									const img = e.currentTarget;
									img.style.display = "none";
									const fallback =
										img.nextSibling as HTMLElement | null;
									if (fallback)
										fallback.style.display = "flex";
								}}
							/>
							{/* Fallback icon shown when image fails to load */}
							<span
								className="h-24 w-full items-center justify-center text-muted-foreground"
								style={{ display: "none" }}
							>
								<ImageIcon className="size-6" />
							</span>
							<div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
						</button>

						{/* ── Edit-mode overlays ──────────────────────────────── */}

						{/* Label — file name or alt text */}
						{labels?.[i] != null && (
							<div className="pointer-events-none absolute bottom-1.5 left-2 max-w-[55%] truncate text-xs font-medium text-white/80">
								{labels[i]}
							</div>
						)}

						{/* Remove */}
						{onRemove && (
							<button
								type="button"
								onClick={() => onRemove(i)}
								className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow transition-colors hover:bg-background"
								aria-label={`Remove ${alt}`}
							>
								<X className="size-3.5" />
							</button>
						)}

						{/* Replace */}
						{onReplace && (
							<>
								<button
									type="button"
									onClick={() =>
										replaceInputRefs.current[i]?.click()
									}
									className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground shadow transition-colors hover:bg-background"
								>
									<ImagePlus className="size-3" />
									Replace
								</button>
								<input
									ref={(el) => {
										replaceInputRefs.current[i] = el;
									}}
									type="file"
									accept={acceptedTypes?.join(",")}
									className="sr-only"
									onChange={(e) => {
										const f = e.target.files?.[0];
										if (f) onReplace(f, i);
										e.target.value = "";
									}}
								/>
							</>
						)}
					</div>
				))}
			</div>

			{/* ── Lightbox ────────────────────────────────────────────────────── */}
			<PhotoCarouselLightbox
				images={images}
				initialIndex={activeIndex}
				open={lightboxOpen}
				onClose={() => setLightboxOpen(false)}
				defaultAspectRatio={defaultAspectRatio}
			/>
		</>
	);
}
