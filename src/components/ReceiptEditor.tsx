// ─── Receipt Editor (inline uploader for edit form) ───────────────────────────

import { X, ImagePlus, AlertCircle } from "lucide-react";
import { useRef, useState } from "react";
import Compressor from "compressorjs";

const MAX_FILE = 10;
const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export interface Receipt {
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
	const itemInputRefs = useRef<(HTMLInputElement | null)[]>([]);
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
		return new Promise((resolve, reject) => {
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

	const handleAdd = async (f: File) => {
		setError(null);
		const err = validate(f);
		if (err) {
			setError(err);
			return;
		}
		if (receipts.length >= MAX_FILE) {
			setError(`You can only upload up to ${MAX_FILE} receipts.`);
			return;
		}

		// Compress the image
		const compressedFile = await compressImage(f);
		onChange([...receipts, { file: compressedFile, url: URL.createObjectURL(compressedFile) }]);
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
		updated[index] = { file: compressedFile, url: URL.createObjectURL(compressedFile) };
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
		<div className="space-y-2">
			{/* Thumbnail grid */}
			{receipts.length > 0 && (
				<div
					className={`grid gap-2 ${receipts.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
				>
					{receipts.map((receipt, index) => (
						<div
							key={receipt.url}
							className="relative rounded-xl overflow-hidden border border-border h-32 group"
						>
							<img
								src={receipt.url}
								alt={`Receipt ${index + 1}`}
								className="w-full h-full object-cover"
							/>
							<div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />

							{/* Remove */}
							<button
								type="button"
								onClick={() => handleRemove(index)}
								className="absolute top-1.5 right-1.5 flex items-center justify-center size-6 rounded-full bg-background/90 text-foreground hover:bg-background transition-colors shadow"
								aria-label="Remove receipt"
							>
								<X className="size-3.5" />
							</button>

							{/* File name */}
							<div className="absolute bottom-1.5 left-2 text-xs text-white/80 font-medium truncate max-w-[55%]">
								{receipt.file?.name ?? "Uploaded receipt"}
							</div>

							{/* Replace — uses per-item ref */}
							<button
								type="button"
								onClick={() =>
									itemInputRefs.current[index]?.click()
								}
								className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground hover:bg-background transition-colors shadow"
							>
								<ImagePlus className="size-3" />
								Replace
							</button>

							{/* Per-item hidden file input */}
							<input
								ref={(el) => {
									itemInputRefs.current[index] = el;
								}}
								type="file"
								accept={ACCEPTED_TYPES.join(",")}
								className="sr-only"
								onChange={(e) => {
									const f = e.target.files?.[0];
									if (f) handleReplace(f, index);
									e.target.value = "";
								}}
							/>
						</div>
					))}
				</div>
			)}

			{/* Add zone */}
			{canAdd && (
				<div className="space-y-1.5">
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
							const f = e.dataTransfer?.files[0];
							if (f) handleAdd(f);
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
						className="sr-only"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) handleAdd(f);
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
