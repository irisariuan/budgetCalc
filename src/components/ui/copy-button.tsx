import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CopyButtonProps {
	/** Text to copy to clipboard */
	text: string;
	/** Success toast message (defaults to "Copied to clipboard") */
	successMessage?: string;
	/** Button size variant */
	size?: "sm" | "default" | "icon" | "icon-sm";
	/** Additional button className */
	className?: string;
	/** Disable the button */
	disabled?: boolean;
	/** ARIA label */
	ariaLabel?: string;
}

export function CopyButton({
	text,
	successMessage = "Copied to clipboard",
	size = "icon",
	className = "",
	disabled = false,
	ariaLabel = "Copy to clipboard",
}: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			toast(successMessage);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast("Failed to copy");
		}
	};

	return (
		<Button
			size={size}
			variant="outline"
			onClick={handleCopy}
			disabled={disabled}
			className={className}
			aria-label={ariaLabel}
		>
			{copied ? (
				<Check className="size-4 text-green-500" />
			) : (
				<Copy className="size-4" />
			)}
		</Button>
	);
}
