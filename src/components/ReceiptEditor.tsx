// ─── Receipt Editor (inline uploader for edit form) ───────────────────────────

import { AlertCircle, ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import Compressor from "compressorjs";
import { ReceiptGallery } from "@/components/PhotoCarousel";

const MAX_FILE = 10;
const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export interface Receipt {
	id: string; // UUID to track each receipt uniquely
	file?: File;
	url: string;
}

interface ReceiptEditorProps {
	receipts: Receipt[];
	onChange: (receipts: Receipt[]) => void;
}

export default function ReceiptEditor({
	receipts,
	onChange,
}: ReceiptEditorProps) {
	// Separate refs: one per existing item (for Replace) + one for the Add zone
	const addInputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [dragging, setDragging] = useState(false);

	const validate = (f: File): string | null => {
		if (!ACCEPTED_TYPES.includes(f.type))
			return "Only JPEG, PNG, WebP, or HEIC images are allowed.";
		if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
			return `File must be under ${MAX_FILE_SIZE_MB} MB.`;
		return null;
	};

	const compressImage = (file: File): Promise<File> => {
		return new Promise((resolve) => {
			new Compressor(file, {
				quality: 0.8,
				maxWidth: 1920,
				maxHeight: 1920,
				mimeType: "image/jpeg",
				success(result) {
					// Convert Blob to File
					const compressedFile = new File([result], file.name, {
						type: "image/jpeg",
						lastModified: Date.now(),
					});
					resolve(compressedFile);
				},
				error(err) {
					console.error("Compression failed:", err.message);
					// If compression fails, use original file
					resolve(file);
				},
			});
		});
	};

	const handleAdd = async (files: File[]) => {
		setError(null);

		const available = MAX_FILE - receipts.length;
		if (available <= 0) {
			setError(`You can only upload up to ${MAX_FILE} receipts.`);
			return;
		}

		// Validate each file; collect the valid ones
		const valid: File[] = [];
		let firstError: string | null = null;
		for (const f of files) {
			const err = validate(f);
			if (err) {
				if (!firstError) firstError = err;
			} else {
				valid.push(f);
			}
		}

		const toAdd = valid.slice(0, available);
		if (valid.length > available) {
			firstError = `Only ${available} more receipt${available === 1 ? "" : "s"} can be added (limit is ${MAX_FILE}).`;
		}
		if (firstError) setError(firstError);
		if (toAdd.length === 0) return;

		// Compress all accepted files in parallel
		const compressed = await Promise.all(toAdd.map(compressImage));
		onChange([
			...receipts,
			...compressed.map((cf) => ({
				id: crypto.randomUUID(),
				file: cf,
				url: URL.createObjectURL(cf),
			})),
		]);
	};

	const handleReplace = async (f: File, index: number) => {
		setError(null);
		const err = validate(f);
		if (err) {
			setError(err);
			return;
		}
		const updated = [...receipts];
		const old = updated[index];
		if (old?.url.startsWith("blob:")) URL.revokeObjectURL(old.url);

		// Compress the image
		const compressedFile = await compressImage(f);
		updated[index] = {
			id: crypto.randomUUID(), // Generate new UUID for replaced receipt
			file: compressedFile,
			url: URL.createObjectURL(compressedFile),
		};
		onChange(updated);
	};

	const handleRemove = (index: number) => {
		const old = receipts[index];
		if (old?.url.startsWith("blob:")) URL.revokeObjectURL(old.url);
		onChange(receipts.filter((_, i) => i !== index));
		setError(null);
	};

	const canAdd = receipts.length < MAX_FILE;

	return (
		<div>
			{/* Thumbnail grid */}
			{receipts.length > 0 && (
				<ReceiptGallery
					urls={receipts.map((r) => r.url)}
					alts={receipts.map((_, i) => `Receipt ${i + 1}`)}
					labels={receipts.map(
						(r) => r.file?.name ?? "Uploaded receipt",
					)}
					thumbnailClassName="h-32"
					onRemove={handleRemove}
					onReplace={handleReplace}
					acceptedTypes={ACCEPTED_TYPES}
				/>
			)}

			{/* Add zone */}
			{canAdd && (
				<div className="space-y-1.5 mt-2">
					<button
						type="button"
						onClick={() => addInputRef.current?.click()}
						onDragOver={(e) => {
							e.preventDefault();
							setDragging(true);
						}}
						onDragLeave={() => setDragging(false)}
						onDrop={(e) => {
							e.preventDefault();
							setDragging(false);
							const files = Array.from(
								e.dataTransfer?.files ?? [],
							);
							if (files.length > 0) handleAdd(files);
						}}
						className={`w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed h-24 transition-colors text-sm ${
							dragging
								? "border-primary bg-primary/5 text-primary"
								: "border-input text-muted-foreground hover:border-primary/50 hover:bg-muted/40"
						}`}
					>
						<ImagePlus className="size-5 opacity-60" />
						<span>
							{receipts.length === 0
								? "Click or drag to attach receipt"
								: "Click or drag to add another"}
						</span>
						<span className="text-xs opacity-60">
							JPEG, PNG, WebP (max {MAX_FILE_SIZE_MB} MB)
						</span>
					</button>
					<input
						ref={addInputRef}
						type="file"
						accept={ACCEPTED_TYPES.join(",")}
						multiple
						className="sr-only"
						onChange={(e) => {
							const files = Array.from(e.target.files ?? []);
							if (files.length > 0) handleAdd(files);
							e.target.value = "";
						}}
					/>
				</div>
			)}

			{/* Error */}
			{error && (
				<div className="flex items-center gap-1.5 text-sm text-destructive">
					<AlertCircle className="size-3.5 shrink-0" />
					{error}
				</div>
			)}

			{/* Max reached note */}
			{!canAdd && (
				<p className="text-xs text-muted-foreground">
					Maximum of {MAX_FILE} photos reached.
				</p>
			)}
		</div>
	);
}
