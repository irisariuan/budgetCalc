import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
	/** Extra classes forwarded to the Button element. */
	className?: string;
	size?: "icon-sm" | "icon";
}

export function ThemeToggle({ className, size = "icon-sm" }: ThemeToggleProps) {
	// Start with undefined so we don't render until we know the real value
	// (avoids a momentary wrong-icon flash on hydration).
	const [isDark, setIsDark] = useState<boolean | undefined>(undefined);

	useEffect(() => {
		setIsDark(document.documentElement.classList.contains("dark"));
	}, []);

	const toggle = () => {
		const next = !isDark;
		setIsDark(next);
		document.documentElement.classList.toggle("dark", next);
		try {
			localStorage.setItem("theme", next ? "dark" : "light");
		} catch {}
	};

	// Don't render until after hydration so the icon matches reality.
	if (isDark === undefined) return null;

	return (
		<Button
			variant="ghost"
			size={size}
			onClick={toggle}
			title={isDark ? "Switch to light mode" : "Switch to dark mode"}
			className={className}
		>
			{isDark ? (
				<Sun className="size-4" />
			) : (
				<Moon className="size-4" />
			)}
			<span className="sr-only">
				{isDark ? "Light mode" : "Dark mode"}
			</span>
		</Button>
	);
}
