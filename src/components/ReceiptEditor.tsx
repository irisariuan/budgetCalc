// ─── Receipt Editor (inline uploader for edit form) ───────────────────────────

import { X, ImagePlus, AlertCircle } from "lucide-react";
import { useRef, useState } from "react";

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
	const inputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [dragging, setDragging] = useState(false);

	const handleNewFile = (f: File) => {
		setError(null);
		if (!ACCEPTED_TYPES.includes(f.type)) {
			setError("Only JPEG, PNG, WebP, or HEIC images are allowed.");
			return;
		}
		if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
			setError(`File must be under ${MAX_FILE_SIZE_MB} MB.`);
			return;
		}
		if (receipts.length >= MAX_FILE) {
			setError(`You can only upload up to ${MAX_FILE} receipts.`);
			return;
		}
		const url = URL.createObjectURL(f);
		onChange([...receipts, { file: f, url }]);
	};
	const handleFile = (f: File, index: number) => {
		setError(null);
		if (!ACCEPTED_TYPES.includes(f.type)) {
			setError("Only JPEG, PNG, WebP, or HEIC images are allowed.");
			return;
		}
		if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
			setError(`File must be under ${MAX_FILE_SIZE_MB} MB.`);
			return;
		}
		const url = URL.createObjectURL(f);
		const updated = [...receipts];
		const selected = updated[index];
		if (selected?.url.startsWith("blob:"))
			URL.revokeObjectURL(selected.url);
		updated[index] = { file: f, url };
		onChange(updated);
	};

	const handleRemove = (index: number) => {
		const selected = receipts[index];
		if (selected?.url.startsWith("blob:"))
			URL.revokeObjectURL(selected.url);
		onChange(receipts.filter((_, i) => i !== index));
		setError(null);
	};

	const uploadPart = (
		<div className="space-y-1.5">
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragging(false);
					const f = e.dataTransfer?.files[0];
					if (f) handleNewFile(f);
				}}
				className={`w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed h-24 transition-colors text-sm ${
					dragging
						? "border-primary bg-primary/5 text-primary"
						: "border-input text-muted-foreground hover:border-primary/50 hover:bg-muted/40"
				}`}
			>
				<ImagePlus className="size-5 opacity-60" />
				<span>Click or drag to attach receipt</span>
				<span className="text-xs opacity-60">
					JPEG, PNG, WebP (max {MAX_FILE_SIZE_MB} MB)
				</span>
			</button>
			{error && (
				<div className="flex items-center gap-1.5 text-sm text-destructive">
					<AlertCircle className="size-3.5 shrink-0" />
					{error}
				</div>
			)}
			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED_TYPES.join(",")}
				className="sr-only"
				onChange={(e) => {
					const f = e.target.files?.[0];
					if (f) handleNewFile(f);
					e.target.value = "";
				}}
			/>
		</div>
	);

	return (
		<>
			{receipts.map((receipt, index) => (
				<div className="relative rounded-xl overflow-hidden border border-border h-36">
					<img
						src={receipt.url}
						alt="Receipt"
						className="w-full h-full object-cover"
					/>
					<div className="absolute inset-0 bg-black/20" />
					<button
						type="button"
						onClick={() => handleRemove(index)}
						className="absolute top-1.5 right-1.5 flex items-center justify-center size-6 rounded-full bg-background/90 text-foreground hover:bg-background transition-colors shadow"
						aria-label="Remove receipt"
					>
						<X className="size-3.5" />
					</button>
					<div className="absolute bottom-1.5 left-2 text-xs text-white/80 font-medium truncate max-w-[80%]">
						{receipt.file?.name ?? "Uploaded receipt"}
					</div>
					<button
						type="button"
						onClick={() => inputRef.current?.click()}
						className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground hover:bg-background transition-colors shadow"
					>
						<ImagePlus className="size-3" />
						Replace
					</button>
					<input
						ref={inputRef}
						type="file"
						accept={ACCEPTED_TYPES.join(",")}
						className="sr-only"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) handleFile(f, index);
							e.target.value = "";
						}}
					/>
				</div>
			))}
		</>
	);
}
