import { useState } from "react";
import { PlaneTakeoff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useStore } from "@/lib/store";
import { Turnstile } from "react-turnstile";

const turnstileKey = import.meta.env.PUBLIC_TURNSTILE_KEY;

// ─── Provider brand SVGs ──────────────────────────────────────────────────────

function GoogleIcon() {
	return (
		<svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden>
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				fill="#4285F4"
			/>
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				fill="#34A853"
			/>
			<path
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				fill="#FBBC05"
			/>
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				fill="#EA4335"
			/>
		</svg>
	);
}

function GitHubIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className="size-4 shrink-0"
			aria-hidden
		>
			<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
		</svg>
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoginScreen() {
	const { actions } = useStore();
	const [loading, setLoading] = useState<"google" | "github" | "anon" | null>(
		null,
	);
	const [captchaToken, setCaptchaToken] = useState<string>();

	const handleGoogle = async () => {
		setLoading("google");
		await actions.signInWithGoogle();
		// Page redirects to OAuth provider — no need to reset loading state.
	};

	const handleGitHub = async () => {
		setLoading("github");
		await actions.signInWithGitHub();
		// Page redirects to OAuth provider — no need to reset loading state.
	};

	const handleAnon = async () => {
		if (!captchaToken) return;
		setLoading("anon");
		await actions.signInAnonymously(captchaToken);
		setLoading(null);
	};

	const busy = loading !== null;

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
			<div className="fixed top-3 right-3">
				<ThemeToggle size="icon" />
			</div>
			{/* ── Hero ── */}
			<div className="mb-10 flex flex-col items-center gap-3 text-center">
				<div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
					<PlaneTakeoff className="size-8" />
				</div>
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						BudgetCalc
					</h1>
					<p className="mt-1 text-muted-foreground">
						Sign in to track shared travel expenses
					</p>
				</div>
			</div>

			{/* ── Sign-in options ── */}
			<div className="w-full max-w-xs flex flex-col gap-3">
				{/* Google */}
				<Button
					size="lg"
					variant="outline"
					className="w-full gap-3 justify-center"
					onClick={handleGoogle}
					disabled={busy}
				>
					{loading === "google" ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<GoogleIcon />
					)}
					Continue with Google
				</Button>
				{/* GitHub */}
				<Button
					size="lg"
					variant="outline"
					className="w-full gap-3 justify-center"
					onClick={handleGitHub}
					disabled={busy}
				>
					{loading === "github" ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<GitHubIcon />
					)}
					Continue with GitHub
				</Button>
				{turnstileKey && (
					<>
						{/* Divider */}
						<div className="flex items-center gap-3 my-1">
							<div className="h-px flex-1 bg-border" />
							<span className="text-xs text-muted-foreground">
								or
							</span>
							<div className="h-px flex-1 bg-border" />
						</div>
						{/* Anonymous */}
						<Button
							size="lg"
							variant="ghost"
							className="w-full text-muted-foreground"
							onClick={handleAnon}
							disabled={busy || !captchaToken}
						>
							{loading === "anon" && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Continue as Guest
						</Button>
						<Turnstile
							sitekey={turnstileKey}
							onSuccess={(token) => setCaptchaToken(token)}
						/>
						<p className="text-center text-xs text-muted-foreground mt-2 px-4">
							Guest sessions are anonymous and stored on this
							device. Sign in with a provider to access your rooms
							from anywhere.
						</p>
					</>
				)}
			</div>
			<div className="fixed bottom-0 left-0 right-0 pb-4">
				<p className="text-center text-xs text-muted-foreground mt-2 px-4">
					This website does not promise safety or security of your
					data nor guarantee consistency of your data. By using this
					website, you agree that you take full responsibility for any
					risks.
				</p>
			</div>
		</div>
	);
}
